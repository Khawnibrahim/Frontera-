import { Injectable } from '@nestjs/common';
import type { SubmitAvailabilityDto } from '../dto/submit-availability.dto';
import type { SubmitTimeOffDto } from '../dto/submit-time-off.dto';

@Injectable()
export class ProviderSchedulingService {
  /**
   * Phase 2 — PRN monthly grid; batch time_off_requests pending_review.
   * Validate deadline and PACR rules.
   */
  async submitAvailability(_dto: SubmitAvailabilityDto): Promise<void> {
    // Not implemented.
  }

  /**
   * Phase 2 — Set-schedule time off / change request (single day or batch).
   * Pre/post deadline PACR handling.
   */
  async submitTimeOff(_dto: SubmitTimeOffDto): Promise<void> {
    // Not implemented.
  }

  /**
   * Phase 5 — ProviderSchedule: approved overrides on weekly pattern.
   */
  async getSchedule(_monthYear: string, _workSiteId?: string): Promise<void> {
    // Not implemented.
  }

  /**
   * Phase 4 — Whether month is finalized for provider’s site (PRN gating).
   */
  async getFinalizationStatus(_workSiteId: string, _monthYear: string): Promise<void> {
    // Not implemented.
  }
}
