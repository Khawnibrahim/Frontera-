import type { InferSelectModel } from 'drizzle-orm';
import type {
  profiles,
  timeOffRequests,
  workSites,
  scheduleFinalizations,
  providerInvites,
} from './db/schema';

export type ProfileRow = InferSelectModel<typeof profiles>;
export type TimeOffRequestRow = InferSelectModel<typeof timeOffRequests>;
export type WorkSiteRow = InferSelectModel<typeof workSites>;
export type ScheduleFinalizationRow = InferSelectModel<typeof scheduleFinalizations>;
export type ProviderInviteRow = InferSelectModel<typeof providerInvites>;

/** Persistence access for scheduling domain (implementations grow per Q1–Q4). */
export interface ISchedulingRepository {
  findProfileByUserId(userId: string): Promise<ProfileRow | null>;
  findWorkSiteById(id: string): Promise<WorkSiteRow | null>;
  listPendingTimeOffForReview(filters: {
    recruiterId?: string;
    workSiteId?: string;
    limit: number;
    offset: number;
  }): Promise<TimeOffRequestRow[]>;
}
