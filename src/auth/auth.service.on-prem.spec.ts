import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, AUTH_PROVIDERS } from './auth.service';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { PendingRegistrationRepository } from '../users/pending-registration.repository';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

function buildConfigService(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    AD_ENABLED: 'false',
    REGISTRATION_DISABLED: 'false',
    REQUIRE_EMAIL_VERIFICATION: 'true',
    FORGOT_PASSWORD_ENABLED: 'true',
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };
  const config = { ...defaults, ...overrides };
  return { get: jest.fn((key: string) => config[key]) };
}

describe('AuthService — on-prem flags', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let pendingRepo: jest.Mocked<PendingRegistrationRepository>;
  let emailService: jest.Mocked<EmailService>;

  async function buildModule(configOverrides: Record<string, string> = {}) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: PendingRegistrationRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'token'), verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: buildConfigService(configOverrides),
        },
        {
          provide: AUTH_PROVIDERS,
          useValue: [],
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    pendingRepo = module.get(PendingRegistrationRepository);
    emailService = module.get(EmailService);
  }

  describe('register()', () => {
    it('throws ForbiddenException when REGISTRATION_DISABLED=true', async () => {
      await buildModule({ REGISTRATION_DISABLED: 'true' });
      await expect(
        service.register({ email: 'a@b.com', password: 'Passw0rd!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when AD_ENABLED=true', async () => {
      await buildModule({ AD_ENABLED: 'true' });
      await expect(
        service.register({ email: 'a@b.com', password: 'Passw0rd!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    describe('REQUIRE_EMAIL_VERIFICATION=false (on-prem mode)', () => {
      beforeEach(() =>
        buildModule({ REQUIRE_EMAIL_VERIFICATION: 'false' }),
      );

      it('creates user directly without pending registration', async () => {
        usersService.findByEmail.mockResolvedValue(null);
        usersService.create.mockResolvedValue({
          id: 'uuid-1',
          email: 'a@b.com',
          name: null,
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
        });

        const result = await service.register({
          email: 'a@b.com',
          password: 'Passw0rd!',
        });

        expect(usersService.create).toHaveBeenCalledWith(
          'a@b.com',
          expect.any(String),
          undefined,
          true,
        );
        expect(pendingRepo.create).not.toHaveBeenCalled();
        expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
        expect(result.message).toContain('You can now log in');
      });

      it('throws ConflictException when email already registered', async () => {
        usersService.findByEmail.mockResolvedValue({
          id: 'uuid-1',
          email: 'a@b.com',
          name: null,
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
        });

        await expect(
          service.register({ email: 'a@b.com', password: 'Passw0rd!' }),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('REQUIRE_EMAIL_VERIFICATION=true (default)', () => {
      beforeEach(() => buildModule());

      it('creates pending registration and sends verification email', async () => {
        usersService.findByEmail.mockResolvedValue(null);
        pendingRepo.findByEmail.mockResolvedValue(null);
        pendingRepo.create.mockResolvedValue({} as any);
        emailService.sendVerificationEmail.mockResolvedValue(undefined);

        const result = await service.register({
          email: 'a@b.com',
          password: 'Passw0rd!',
        });

        expect(pendingRepo.create).toHaveBeenCalled();
        expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
          'a@b.com',
          expect.any(String),
          undefined,
        );
        expect(usersService.create).not.toHaveBeenCalled();
        expect(result.message).toContain('verify your account');
      });
    });
  });

  describe('forgotPassword()', () => {
    it('throws ServiceUnavailableException when FORGOT_PASSWORD_ENABLED=false', async () => {
      await buildModule({ FORGOT_PASSWORD_ENABLED: 'false' });
      await expect(
        service.forgotPassword({ email: 'a@b.com' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws ForbiddenException when AD_ENABLED=true', async () => {
      await buildModule({ AD_ENABLED: 'true' });
      await expect(
        service.forgotPassword({ email: 'a@b.com' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
