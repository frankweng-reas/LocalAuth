import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.usersService.create(email, passwordHash, name);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 小時有效

    // Save verification token
    await this.usersRepository.setVerificationToken(
      user.id,
      verificationToken,
      tokenExpires,
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
      name,
    );

    // Generate tokens
    const access_token = this.generateAccessToken(user);
    const refresh_token = this.generateRefreshToken(user);

    // Store refresh token
    await this.usersRepository.updateRefreshToken(user.id, refresh_token);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: false,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with password
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const access_token = this.generateAccessToken(user);
    const refresh_token = this.generateRefreshToken(user);

    // Store refresh token
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

    // Get user with password
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(old_password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password
    await this.usersRepository.updatePassword(userId, newPasswordHash);

    // Revoke all refresh tokens for security
    await this.usersRepository.updateRefreshToken(userId, null);

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

    // Find user by verification token
    const user = await this.usersRepository.findByVerificationToken(token);
    
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark email as verified
    await this.usersRepository.markEmailAsVerified(user.id);

    return {
      message: 'Email verified successfully',
      email: user.email,
    };
  }

  async resendVerification(resendVerificationDto: ResendVerificationDto) {
    const { email } = resendVerificationDto;

    // Find user
    const user = await this.usersRepository.findByEmail(email);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 小時有效

    // Save verification token
    await this.usersRepository.setVerificationToken(
      user.id,
      verificationToken,
      tokenExpires,
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
      user.name ?? undefined,
    );

    return {
      message: 'Verification email sent successfully',
    };
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
    return this.jwtService.sign(payload, {
      expiresIn: '30d', // Refresh token 有效期 30 天
    });
  }
}
