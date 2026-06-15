import { SetMetadata } from '@nestjs/common';
import type { AppRole } from '../auth.types';

export const ROLES_KEY = 'roles';

/** Require at least one of the listed `user_roles.role` values when auth is enforced. */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
