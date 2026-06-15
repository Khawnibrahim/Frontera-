import type { IAppConfig } from '../config/app-config.interface';
import { DomainErrors } from '../common/errors/domain-errors';

/** Base URL for invite email links (Nest-hosted `GET/POST /accept-invite`). */
export function resolveInviteAcceptBaseUrl(config: IAppConfig): string {
  const api = config.get<string>('FRONTERA_API_PUBLIC_URL')?.trim();
  if (api) return api.replace(/\/$/, '');

  // Local Docker / npm run start:dev — invite links must open in the provider's browser.
  if (config.get<string>('NODE_ENV') !== 'production') {
    const port = config.get<string>('PORT') ?? '3000';
    return `http://localhost:${port}`;
  }

  throw DomainErrors.inviteUrlConfigRequired();
}

/** Where to send the provider after a successful password setup. */
export function resolveProviderPortalUrl(config: IAppConfig): string {
  const portal = config.get<string>('FRONTERA_APP_URL')?.trim();
  if (portal) return portal.replace(/\/$/, '');
  return '/';
}

/**
 * Redirect target after POST /accept-invite succeeds.
 * Preserves existing query params on `FRONTERA_APP_URL` (e.g. `?portal=provider`).
 */
export function buildPostInviteRedirectUrl(portalBase: string): string {
  if (!portalBase.startsWith('http')) return portalBase;

  const url = new URL(portalBase);
  url.searchParams.set('activated', '1');
  if (!url.searchParams.has('portal')) {
    url.searchParams.set('portal', 'provider');
  }
  return url.toString();
}
