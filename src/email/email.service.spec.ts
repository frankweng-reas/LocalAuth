import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string | number> = {
                EMAIL_PROVIDER: 'smtp',
                SMTP_HOST: 'smtp-relay.gmail.com',
                SMTP_PORT: 587,
                SMTP_USER: 'developer@reas.com.tw',
                SMTP_PASS: 'app-password',
                EMAIL_FROM: '"Neurosme AI" <neurosme@reas.com.tw>',
                BASE_URL: 'http://localhost:4000',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail (SMTP)', () => {
    it('should send verification email via SMTP', async () => {
      await service.sendVerificationEmail(
        'test@example.com',
        'test-token-123',
        'Test User',
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp-relay.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'developer@reas.com.tw',
          pass: 'app-password',
        },
      });

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Neurosme AI" <neurosme@reas.com.tw>',
          to: 'test@example.com',
          subject: '請驗證您的 Email',
        }),
      );
      expect(sendMailMock.mock.calls[0][0].html).toContain('test-token-123');
      expect(sendMailMock.mock.calls[0][0].html).toContain(
        'http://localhost:4000/auth/verify-email?token=test-token-123',
      );
    });
  });
});
