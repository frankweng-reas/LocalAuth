import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { PendingRegistrationRepository } from '../users/pending-registration.repository';
import { EmailService } from '../email/email.service';
import { IAuthProvider } from './providers/auth-provider.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePasswordExpiredDto } from './dto/change-password-expired.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export const AUTH_PROVIDERS = 'AUTH_PROVIDERS';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly pendingRegistrationRepository: PendingRegistrationRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @Inject(AUTH_PROVIDERS) private readonly authProviders: IAuthProvider[],
  ) {}

  async register(registerDto: RegisterDto) {
    if (this.configService.get<string>('AD_ENABLED') === 'true') {
      throw new ForbiddenException('Registration is disabled when AD is enabled');
    }

    if (this.configService.get<string>('REGISTRATION_DISABLED') === 'true') {
      throw new ForbiddenException('Self-registration is disabled. Please contact your administrator.');
    }

    const { email, password, name } = registerDto;

    // Check if user or pending registration already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // On-prem mode: skip email verification, create user directly
    const requireEmailVerification = this.configService.get<string>('REQUIRE_EMAIL_VERIFICATION') !== 'false';
    if (!requireEmailVerification) {
      await this.usersService.create(email, passwordHash, name, true);
      return {
        message: 'Registration successful. You can now log in.',
      };
    }

    const existingPending = await this.pendingRegistrationRepository.findByEmail(email);
    if (existingPending) {
      throw new ConflictException('Email already registered');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 小時有效

    // 寫入 PendingRegistration，不寫入 User（email 確認後才建立 User）
    await this.pendingRegistrationRepository.create(
      email,
      passwordHash,
      name,
      verificationToken,
      tokenExpires,
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
      name,
    );

    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const PASSWORD_EXPIRY_DAYS = 90;

    for (const provider of this.authProviders) {
      const user = await provider.validateCredentials(email, password);
      if (user) {
        // 本地註冊用戶需先完成 email 確認才能登入（AD 用戶不在此限）
        if (
          !user.passwordHash.startsWith('AD_') &&
          !user.emailVerified
        ) {
          throw new UnauthorizedException(
            '請先至信箱確認您的註冊，確認後即可登入',
          );
        }
        // 本地用戶密碼 90 天到期檢查（AD 用戶不在此限）
        if (!user.passwordHash.startsWith('AD_')) {
          const passwordChangedAt = (user as { passwordChangedAt?: Date | null })
            .passwordChangedAt;
          const isExpired =
            !passwordChangedAt ||
            Date.now() - new Date(passwordChangedAt).getTime() >
              PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          if (isExpired) {
            throw new ForbiddenException(
              '密碼已過期，請更換密碼',
            );
          }
        }
        const access_token = this.generateAccessToken(user);
        const refresh_token = this.generateRefreshToken(user);
        await this.usersRepository.updateRefreshToken(user.id, refresh_token);
        return {
          access_token,
          refresh_token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        };
      }
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refresh_token } = refreshTokenDto;

    try {
      // Verify refresh token signature
      const payload = this.jwtService.verify(refresh_token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // CRITICAL: Find user by refresh token stored in database
      // This ensures only the latest refresh token is valid
      const user = await this.usersRepository.findByRefreshToken(refresh_token);
      
      if (!user || user.id !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User is inactive');
      }

      // Generate new tokens
      const new_access_token = this.generateAccessToken(user);
      const new_refresh_token = this.generateRefreshToken(user);

      // Update refresh token in database
      // This invalidates the old refresh token
      await this.usersRepository.updateRefreshToken(user.id, new_refresh_token);

      return {
        access_token: new_access_token,
        refresh_token: new_refresh_token,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.usersRepository.findById(payload.sub);
      if (!user || !user.isActive) {
        return { valid: false };
      }

      return {
        valid: true,
        userId: user.id,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { old_password, new_password } = changePasswordDto;

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // AD 用戶無法在此修改密碼
    if (user.passwordHash.startsWith('AD_')) {
      throw new BadRequestException('AD users cannot change password here');
    }

    const isPasswordValid = await bcrypt.compare(old_password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);
    await this.usersRepository.updatePassword(userId, newPasswordHash);
    await this.usersRepository.updateRefreshToken(userId, null);

    return { message: 'Password updated successfully' };
  }

  /** 密碼過期時強制更換（不需登入） */
  async changePasswordExpired(dto: ChangePasswordExpiredDto) {
    const { email, old_password, new_password } = dto;

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.passwordHash.startsWith('AD_')) {
      throw new BadRequestException('AD users cannot change password here');
    }

    const isPasswordValid = await bcrypt.compare(old_password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const PASSWORD_EXPIRY_DAYS = 90;
    const passwordChangedAt = (user as { passwordChangedAt?: Date | null })
      .passwordChangedAt;
    const isExpired =
      !passwordChangedAt ||
      Date.now() - new Date(passwordChangedAt).getTime() >
        PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (!isExpired) {
      throw new BadRequestException(
        '密碼尚未過期，請使用一般修改密碼功能',
      );
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);
    await this.usersRepository.updatePassword(user.id, newPasswordHash);
    await this.usersRepository.updateRefreshToken(user.id, null);

    return { message: 'Password updated successfully' };
  }

  async logout(userId: string) {
    // Revoke refresh token to prevent further token refreshing
    await this.usersRepository.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async revokeAllSessions(userId: string) {
    // Revoke all refresh tokens (same as logout in current single-token implementation)
    await this.usersRepository.updateRefreshToken(userId, null);
    return { message: 'All sessions revoked successfully' };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    // Find pending registration by verification token
    const pending = await this.pendingRegistrationRepository.findByVerificationToken(token);
    
    if (!pending) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // 建立 User（email 已確認後才寫入 User table）
    const user = await this.usersService.create(
      pending.email,
      pending.passwordHash,
      pending.name ?? undefined,
      true, // emailVerified：用戶已透過驗證連結完成確認
    );

    // 明確標記為已驗證（雙重確保 emailVerified 正確寫入）
    await this.usersRepository.markEmailAsVerified(user.id);

    // 刪除待驗證記錄
    await this.pendingRegistrationRepository.delete(pending.id);

    return {
      message: 'Email verified successfully',
      email: pending.email,
    };
  }

  async resendVerification(resendVerificationDto: ResendVerificationDto) {
    const { email } = resendVerificationDto;

    // Find pending registration（待驗證註冊在 PendingRegistration，不在 User）
    const pending = await this.pendingRegistrationRepository.findByEmail(email);
    
    if (!pending) {
      throw new NotFoundException('User not found');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 小時有效

    // Save verification token
    await this.pendingRegistrationRepository.updateVerificationToken(
      pending.id,
      verificationToken,
      tokenExpires,
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
      pending.name ?? undefined,
    );

    return {
      message: 'Verification email sent successfully',
    };
  }

  /** 忘記密碼：寄出重設連結（為防 email 枚舉，無論是否存在皆回傳成功） */
  async forgotPassword(dto: ForgotPasswordDto) {
    if (this.configService.get<string>('AD_ENABLED') === 'true') {
      throw new ForbiddenException('Password reset is disabled when AD is enabled');
    }

    if (this.configService.get<string>('FORGOT_PASSWORD_ENABLED') === 'false') {
      throw new ServiceUnavailableException('密碼重設功能已停用，請聯絡系統管理員');
    }

    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      return { message: '若該信箱已註冊，您將收到密碼重設郵件' };
    }

    if (user.passwordHash.startsWith('AD_')) {
      return { message: '若該信箱已註冊，您將收到密碼重設郵件' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 小時有效

    await this.usersRepository.setPasswordResetToken(user.id, token, expiresAt);
    await this.emailService.sendPasswordResetEmail(
      user.email,
      token,
      user.name ?? undefined,
    );

    return { message: '若該信箱已註冊，您將收到密碼重設郵件' };
  }

  /** 重設密碼：以 token 設定新密碼 */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersRepository.findByPasswordResetToken(dto.token);
    if (!user) {
      throw new BadRequestException('連結無效或已過期，請重新申請重設密碼');
    }

    if (user.passwordHash.startsWith('AD_')) {
      throw new BadRequestException('AD users cannot reset password here');
    }

    const newPasswordHash = await bcrypt.hash(dto.new_password, 10);
    await this.usersRepository.updatePassword(user.id, newPasswordHash);
    await this.usersRepository.clearPasswordResetToken(user.id);
    await this.usersRepository.updateRefreshToken(user.id, null);

    return { message: '密碼已重設成功，請使用新密碼登入' };
  }

  private generateAccessToken(user: { id: string; email: string }): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(user: { id: string; email: string }): string {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      type: 'refresh',
      jti: Math.random().toString(36).substring(2) + Date.now().toString(36), // 確保每次都不同
    };
    const expiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as `${number}s` | `${number}m` | `${number}h` | `${number}d`;
    return this.jwtService.sign(payload, { expiresIn });
  }
}
