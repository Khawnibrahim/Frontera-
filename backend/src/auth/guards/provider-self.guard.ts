import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AppErrors } from '../../common/errors/app-errors';
import { isAuthEnforced } from '../auth.config';

@Injectable()
export class ProviderSelfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isAuthEnforced(this.config)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      throw AppErrors.unauthorized();
    }

    if (user.roles.includes('admin')) {
      return true;
    }

    const providerId = request.params.providerId;
    if (!providerId || user.id !== providerId) {
      throw AppErrors.providerAccessDenied();
    }

    return true;
  }
}
