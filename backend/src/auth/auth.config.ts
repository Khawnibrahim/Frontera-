import type { ConfigService } from '@nestjs/config';

/** Derive JWKS URL from env (`SUPABASE_JWKS_URL` or `SUPABASE_URL`). */
export function resolveJwksUrl(config: ConfigService): string | undefined {
  const explicit = config.get<string>('SUPABASE_JWKS_URL')?.trim();
  if (explicit) {
    return explicit;
  }

  const supabaseUrl = config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
  if (!supabaseUrl) {
    return undefined;
  }

  return `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
}

/** Whether API routes require a valid Supabase JWT (see `docs/api-auth.md`). */
export function isAuthEnforced(config: ConfigService): boolean {
  if (config.get<string>('AUTH_DISABLED') === 'true') {
    return false;
  }

  const secret = config.get<string>('SUPABASE_JWT_SECRET')?.trim();
  const jwksUrl = resolveJwksUrl(config);
  if (secret || jwksUrl) {
    return true;
  }

  return config.get<string>('NODE_ENV') === 'production';
}
