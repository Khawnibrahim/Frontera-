/** Portal roles from `user_roles.role` / `app_role` enum. */
export type AppRole = 'admin' | 'internal_staff' | 'provider_user' | 'client_user';

/** Attached to `request.user` after JWT verification and role lookup. */
export type AuthenticatedUser = {
  /** Supabase `auth.users.id` from JWT `sub`. */
  id: string;
  email?: string;
  roles: AppRole[];
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
