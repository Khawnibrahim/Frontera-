import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/errors/error-codes';
import { ProviderSelfGuard } from './provider-self.guard';

describe('ProviderSelfGuard', () => {
  const createGuard = (env: Record<string, string | undefined>) => {
    const config = {
      get: (key: string) => env[key],
    } as ConfigService;

    return new ProviderSelfGuard(config);
  };

  const mockContext = (
    user: { id: string; roles: string[] } | undefined,
    providerId: string,
    env: Record<string, string | undefined> = { SUPABASE_JWT_SECRET: 'secret' },
  ): ExecutionContext => {
    const request = { user, params: { providerId } };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  };

  it('allows admin to access any providerId', () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'secret' });
    const context = mockContext(
      { id: 'admin-1', roles: ['admin'] },
      'other-provider-id',
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows provider when providerId matches jwt sub', () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'secret' });
    const providerId = 'provider-1';
    const context = mockContext(
      { id: providerId, roles: ['provider_user'] },
      providerId,
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects provider accessing another providerId', () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'secret' });
    const context = mockContext(
      { id: 'provider-1', roles: ['provider_user'] },
      'provider-2',
    );

    expect(() => guard.canActivate(context)).toThrow(
      expect.objectContaining({ code: ErrorCode.PROVIDER_ACCESS_DENIED }),
    );
  });
});
