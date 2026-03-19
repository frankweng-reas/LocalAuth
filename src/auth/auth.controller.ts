import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePasswordExpiredDto } from './dto/change-password-expired.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('validate-token')
  async validateToken(@Body() validateTokenDto: ValidateTokenDto) {
    return this.authService.validateToken(validateTokenDto.token);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  @Get('userinfo')
  @UseGuards(JwtAuthGuard)
  async getUserInfo(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.emailVerified,
    };
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  /** 密碼過期時強制更換（不需 JWT，供登入被拒時使用） */
  @Post('change-password-expired')
  async changePasswordExpired(
    @Body() dto: ChangePasswordExpiredDto,
  ) {
    return this.authService.changePasswordExpired(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  @Post('revoke-all-sessions')
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@Request() req) {
    return this.authService.revokeAllSessions(req.user.userId);
  }

  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Get('verify-email')
  async verifyEmailGet(
    @Query('token') token: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    if (!token) {
      res.status(400).send(this.getVerifyEmailHtml(false, '缺少驗證碼'));
      return;
    }
    try {
      const result = await this.authService.verifyEmail({ token });
      res
        .status(200)
        .type('text/html')
        .send(this.getVerifyEmailHtml(true, result.email));
    } catch (error: any) {
      let message = '驗證失敗，連結可能已過期';
      const errMsg = error?.response?.message ?? error?.message;
      if (errMsg) {
        message = Array.isArray(errMsg) ? errMsg[0] : errMsg;
      }
      res
        .status(error?.status ?? error?.statusCode ?? 400)
        .type('text/html')
        .send(this.getVerifyEmailHtml(false, message));
    }
  }

  private getVerifyEmailHtml(success: boolean, emailOrMessage: string): string {
    const title = success ? 'Email 驗證成功' : '驗證失敗';
    const icon = success ? '✅' : '❌';
    const message = success
      ? `您的 Email ${emailOrMessage} 已完成驗證，現在可以登入使用。`
      : emailOrMessage;
    const bgColor = success ? '#10b981' : '#ef4444';

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - LocalAuth</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 48px;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { color: #333; font-size: 24px; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
    .badge { display: inline-block; background: ${bgColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="badge">LocalAuth</span>
  </div>
</body>
</html>`;
  }

  @Post('resend-verification')
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendVerificationDto);
  }

  /** 忘記密碼：輸入 email 後寄出重設連結 */
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /** 重設密碼：以 token 設定新密碼 */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /** GET 重設密碼頁面（含 token 的連結點擊後顯示表單） */
  @Get('reset-password')
  async resetPasswordGet(
    @Query('token') token: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    if (!token) {
      res.status(400).type('text/html').send(this.getResetPasswordHtml('缺少 token', null));
      return;
    }
    res.status(200).type('text/html').send(this.getResetPasswordHtml(null, token));
  }

  private getResetPasswordHtml(error: string | null, token: string | null): string {
    // 表單 POST 使用相對路徑，與當前頁面同源
    const apiPath = '/auth/reset-password';
    const title = error ? '重設密碼失敗' : '重設密碼';
    const formHtml = token
      ? `
        <form id="resetForm" style="margin-top: 20px;">
          <input type="hidden" name="token" value="${token}">
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">新密碼</label>
            <input type="password" name="new_password" required minlength="8" 
              placeholder="至少 8 碼，含大寫/小寫/數字/符號其中 3 種"
              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          </div>
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">確認密碼</label>
            <input type="password" name="confirm_password" required
              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          </div>
          <button type="submit" style="width: 100%; padding: 12px; background: #4F46E5; color: white; border: none; border-radius: 6px; cursor: pointer;">重設密碼</button>
        </form>
        <div id="result" style="margin-top: 16px; display: none;"></div>
        <script>
          document.getElementById('resetForm').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const np = fd.get('new_password');
            const cp = fd.get('confirm_password');
            if (np !== cp) { alert('兩次輸入的密碼不一致'); return; }
            const result = document.getElementById('result');
            result.style.display = 'block';
            try {
              const r = await fetch('${apiPath}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: fd.get('token'), new_password: np })
              });
              const data = await r.json();
              if (r.ok) {
                result.innerHTML = '<p style="color: #10b981;">✅ ' + (data.message || '密碼已重設') + '</p><p><a href="/auth-test.html">前往登入</a></p>';
                e.target.remove();
              } else {
                result.innerHTML = '<p style="color: #ef4444;">❌ ' + (data.message || data.error || '重設失敗') + '</p>';
              }
            } catch (err) {
              result.innerHTML = '<p style="color: #ef4444;">❌ 請求失敗</p>';
            }
          };
        </script>
      `
      : '';

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - LocalAuth</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 48px; max-width: 420px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
    h1 { color: #333; font-size: 24px; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    ${error ? `<p class="error">${error}</p>` : '<p>請設定您的新密碼：</p>'}
    ${formHtml}
  </div>
</body>
</html>`;
  }
}
