import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '../../common/errors/error-codes';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const createGuard = (
    env: Record<string, string | undefined>,
    requiredRoles: string[] | undefined,
  ) => {
    const config = {
      get: (key: string) => env[key],
    } as ConfigService;

    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) {
        return requiredRoles;
      }
      return false;
    });

    const guard = new RolesGuard(reflector, config);
    return guard;
  };

  const mockContext = (user: { id: string; roles: string[] } | undefined): ExecutionContext => {
    const request = { user };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  it('allows when auth is not enforced', () => {
    const guard = createGuard({ NODE_ENV: 'development' }, ['admin']);
    const context = mockContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects when user lacks required role', () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'secret' }, ['admin', 'internal_staff']);
    const context = mockContext({ id: 'user-1', roles: ['provider_user'] });

    expect(() => guard.canActivate(context)).toThrow(
      expect.objectContaining({ code: ErrorCode.INSUFFICIENT_ROLE }),
    );
  });

  it('allows when user has one of the required roles', () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'secret' }, ['admin', 'internal_staff']);
    const context = mockContext({ id: 'user-1', roles: ['internal_staff'] });

    expect(guard.canActivate(context)).toBe(true);
  });
});
