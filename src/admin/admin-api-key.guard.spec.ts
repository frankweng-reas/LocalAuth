import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminApiKeyGuard } from './admin-api-key.guard';

function mockContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminApiKeyGuard', () => {
  let guard: AdminApiKeyGuard;
  let configGetMock: jest.Mock;

  beforeEach(async () => {
    configGetMock = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminApiKeyGuard,
        {
          provide: ConfigService,
          useValue: { get: configGetMock },
        },
      ],
    }).compile();

    guard = module.get<AdminApiKeyGuard>(AdminApiKeyGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('throws 401 when ADMIN_API_KEY is not configured', () => {
    configGetMock.mockReturnValue(undefined);
    expect(() =>
      guard.canActivate(mockContext({ 'x-admin-api-key': 'anything' })),
    ).toThrow('Admin API is not configured');
  });

  it('throws 401 when header is missing', () => {
    configGetMock.mockReturnValue('secret-key');
    expect(() => guard.canActivate(mockContext({}))).toThrow(
      'Invalid or missing admin API key',
    );
  });

  it('throws 401 when header value is wrong', () => {
    configGetMock.mockReturnValue('secret-key');
    expect(() =>
      guard.canActivate(mockContext({ 'x-admin-api-key': 'wrong-key' })),
    ).toThrow('Invalid or missing admin API key');
  });

  it('returns true when header matches ADMIN_API_KEY', () => {
    configGetMock.mockReturnValue('secret-key');
    const result = guard.canActivate(
      mockContext({ 'x-admin-api-key': 'secret-key' }),
    );
    expect(result).toBe(true);
  });
});
