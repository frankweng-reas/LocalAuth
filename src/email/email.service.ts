import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

type EmailProvider = 'console' | 'resend' | 'sendgrid' | 'smtp';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;
  private resend?: Resend;
  private smtpTransporter?: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<EmailProvider>('EMAIL_PROVIDER') || 'console';
    
    // 初始化 Resend
    if (this.provider === 'resend') {
      const apiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!apiKey) {
        this.logger.warn('RESEND_API_KEY not set, falling back to console mode');
        this.provider = 'console';
      } else {
        this.resend = new Resend(apiKey);
        this.logger.log('✅ Resend email service initialized');
      }
    }

    // 初始化 SMTP（支援 Gmail SMTP Relay）
    if (this.provider === 'smtp') {
      const host = this.configService.get<string>('SMTP_HOST');
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');
      if (!host || !user || !pass) {
        this.logger.warn('SMTP_HOST, SMTP_USER, SMTP_PASS not set, falling back to console mode');
        this.provider = 'console';
      } else {
        const port = this.configService.get<number>('SMTP_PORT') || 587;
        this.smtpTransporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log(`✅ SMTP email service initialized (${host}:${port})`);
      }
    }
  }

  /**
   * 發送 Email 驗證郵件
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    name?: string,
  ): Promise<void> {
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    
    const subject = '請驗證您的 Email';
    const html = this.generateVerificationEmailHtml(verificationUrl, name, token);
    const text = this.generateVerificationEmailText(verificationUrl, name, token);

    switch (this.provider) {
      case 'resend':
        await this.sendViaResend(email, subject, html, text);
        break;
      case 'smtp':
        await this.sendViaSmtp(email, subject, html, text);
        break;
      case 'console':
      default:
        this.logEmailToConsole(email, subject, text, name);
        break;
    }
  }

  /**
   * 透過 Resend 發送郵件
   */
  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend not initialized');
    }

    const from = this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';

    try {
      const { data, error } = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.error('Failed to send email via Resend:', error);
        throw error;
      }

      this.logger.log(`✅ Email sent via Resend to ${to} (ID: ${data?.id})`);
    } catch (error) {
      this.logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * 透過 SMTP 發送郵件（支援 Gmail SMTP Relay）
   */
  private async sendViaSmtp(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP not initialized');
    }

    const from = this.configService.get<string>('EMAIL_FROM') || 'noreply@localhost';

    try {
      const info = await this.smtpTransporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });

      this.logger.log(`✅ Email sent via SMTP to ${to} (MessageID: ${info.messageId})`);
    } catch (error) {
      this.logger.error('Failed to send email via SMTP:', error);
      throw error;
    }
  }

  /**
   * 輸出郵件到 Console（開發模式）
   */
  private logEmailToConsole(
    email: string,
    subject: string,
    text: string,
    name?: string,
  ): void {
    this.logger.log('========================================');
    this.logger.log('📧 Email (CONSOLE MODE)');
    this.logger.log('========================================');
    this.logger.log(`To: ${email}`);
    this.logger.log(`Name: ${name || 'User'}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log('');
    this.logger.log('Body:');
    this.logger.log(text);
    this.logger.log('========================================');
  }

  /**
   * 生成驗證郵件 HTML
   */
  private generateVerificationEmailHtml(
    verificationUrl: string,
    name?: string,
    token?: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #4F46E5; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px;
            margin: 20px 0;
          }
          .token { 
            background: #f3f4f6; 
            padding: 10px; 
            border-radius: 5px; 
            font-family: monospace;
            word-break: break-all;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Email 驗證</h2>
          <p>Hi ${name || 'User'},</p>
          <p>感謝您註冊！請點擊下方按鈕驗證您的 Email：</p>
          <a href="${verificationUrl}" class="button">驗證 Email</a>
          <p>或複製以下連結到瀏覽器：</p>
          <div class="token">${verificationUrl}</div>
          <p>此連結將在 <strong>24 小時</strong>後過期。</p>
          <div class="footer">
            <p>如果您沒有註冊此帳號，請忽略此郵件。</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成驗證郵件純文字版本
   */
  private generateVerificationEmailText(
    verificationUrl: string,
    name?: string,
    token?: string,
  ): string {
    return `
Hi ${name || 'User'},

感謝您註冊！請點擊以下連結驗證您的 Email：

${verificationUrl}

或使用以下驗證碼：
Token: ${token}

此連結將在 24 小時後過期。

如果您沒有註冊此帳號，請忽略此郵件。
    `.trim();
  }

  /**
   * 發送密碼重設郵件
   * （未來功能預留）
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    name?: string,
  ): Promise<void> {
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    this.logger.log('========================================');
    this.logger.log('🔑 Password Reset Email (SIMULATED)');
    this.logger.log('========================================');
    this.logger.log(`To: ${email}`);
    this.logger.log(`Reset URL: ${resetUrl}`);
    this.logger.log('========================================');
  }
}
