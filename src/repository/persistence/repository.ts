import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type { IDbClient } from './db/interface';
import { profiles, timeOffRequests, workSites } from './db/schema';
import type { ISchedulingRepository, ProfileRow, TimeOffRequestRow, WorkSiteRow } from './interface';

@Injectable()
export class SchedulingRepository implements ISchedulingRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  async findProfileByUserId(userId: string): Promise<ProfileRow | null> {
    const rows = await this.dbClient.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findWorkSiteById(id: string): Promise<WorkSiteRow | null> {
    const rows = await this.dbClient.db
      .select()
      .from(workSites)
      .where(eq(workSites.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async listPendingTimeOffForReview(filters: {
    recruiterId?: string;
    workSiteId?: string;
    limit: number;
    offset: number;
  }): Promise<TimeOffRequestRow[]> {
    const conditions = [eq(timeOffRequests.status, 'pending_review')];
    if (filters.recruiterId) {
      conditions.push(eq(timeOffRequests.recruiterId, filters.recruiterId));
    }
    if (filters.workSiteId) {
      conditions.push(eq(timeOffRequests.workSiteId, filters.workSiteId));
    }

    return this.dbClient.db
      .select()
      .from(timeOffRequests)
      .where(and(...conditions))
      .orderBy(desc(timeOffRequests.requestDate))
      .limit(filters.limit)
      .offset(filters.offset);
  }
}
