import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JWTVerifyGetKey, JWTVerifyOptions } from 'jose';
import { AppErrors } from '../common/errors/app-errors';
import { TOKENS } from '../config/tokens';
import { isAuthEnforced, resolveJwksUrl } from './auth.config';
import { AuthRepository } from './auth.repository';
import type { AuthenticatedUser } from './auth.types';
import { getJose, type JoseModule } from './jose-loader';

type JwtClaims = {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string | string[];
};

@Injectable()
export class SupabaseJwtService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseJwtService.name);
  private jose!: JoseModule;
  private hs256Secret?: Uint8Array;
  private jwks?: JWTVerifyGetKey;

  constructor(
    private readonly config: ConfigService,
    @Inject(TOKENS.AuthRepository)
    private readonly authRepository: AuthRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!isAuthEnforced(this.config)) {
      this.logger.log('Auth enforcement disabled — routes are open without JWT');
      return;
    }

    this.jose = await getJose();

    const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
    if (secret) {
      this.hs256Secret = new TextEncoder().encode(secret);
    }

    const jwksUrl = resolveJwksUrl(this.config);
    if (jwksUrl) {
      this.jwks = this.jose.createRemoteJWKSet(new URL(jwksUrl));
    }

    if (!this.hs256Secret && !this.jwks) {
      throw new Error(
        'Auth is enforced but neither SUPABASE_JWT_SECRET nor SUPABASE_URL/SUPABASE_JWKS_URL is configured',
      );
    }
  }

  async authenticateBearerToken(token: string): Promise<AuthenticatedUser> {
    if (!this.jose && isAuthEnforced(this.config)) {
      this.jose = await getJose();
    }

    const claims = await this.verifyToken(token);
    const userId = claims.sub;
    if (!userId) {
      throw AppErrors.unauthorized('Token is missing subject');
    }

    const roles = await this.authRepository.listRolesForUser(userId);

    return {
      id: userId,
      email: typeof claims.email === 'string' ? claims.email : undefined,
      roles,
    };
  }

  private async verifyToken(token: string): Promise<JwtClaims> {
    const jose = this.jose ?? (await getJose());
    const verifyOptions = this.buildVerifyOptions();

    if (this.hs256Secret) {
      try {
        const { payload } = await jose.jwtVerify(token, this.hs256Secret, verifyOptions);
        return payload as JwtClaims;
      } catch (err) {
        if (!this.jwks) {
          throw AppErrors.unauthorized(this.jwtErrorMessage(jose, err));
        }
      }
    }

    if (!this.jwks) {
      throw AppErrors.unauthorized('JWT verification is not configured');
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.jwks, verifyOptions);
      return payload as JwtClaims;
    } catch (err) {
      throw AppErrors.unauthorized(this.jwtErrorMessage(jose, err));
    }
  }

  private buildVerifyOptions(): JWTVerifyOptions {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
    const options: JWTVerifyOptions = {
      audience: 'authenticated',
    };

    if (supabaseUrl) {
      options.issuer = `${supabaseUrl}/auth/v1`;
    }

    return options;
  }

  private jwtErrorMessage(jose: JoseModule, err: unknown): string {
    if (err instanceof jose.errors.JWTExpired) {
      return 'Token expired';
    }
    if (err instanceof jose.errors.JWTClaimValidationFailed) {
      return 'Invalid token claims';
    }
    return 'Invalid token';
  }
}
