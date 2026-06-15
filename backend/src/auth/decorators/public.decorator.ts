import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT and role guards (e.g. `/health`, `/accept-invite`). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
