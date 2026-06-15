import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { TOKENS } from '../config/tokens';
import type { IDbClient } from '../repository/persistence/interface';
import { userRoles } from '../repository/persistence/db/schema';
import type { AppRole } from './auth.types';

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(TOKENS.DbClient)
    private readonly dbClient: IDbClient,
  ) {}

  async listRolesForUser(userId: string): Promise<AppRole[]> {
    const rows = await this.dbClient.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    return rows.map((row) => row.role);
  }
}
