import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '../../config/tokens';
import type { ISchedulingRepository, TimeOffRequestRow } from '../../repository/persistence/interface';
import type { AceImoExportDto } from '../dto/ace-imo-export.dto';
import type { DenyRequestDto } from '../dto/deny-request.dto';
import type { FinalizeMonthDto } from '../dto/finalize-month.dto';

@Injectable()
export class AdminSchedulingService {
  constructor(
    @Inject(TOKENS.SchedulingRepository)
    private readonly schedulingRepository: ISchedulingRepository,
  ) {}

  /** Phase 3 — CorporateTimeOffReview; basic filters implemented. */
  async listPendingReview(params: {
    recruiterId?: string;
    workSiteId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TimeOffRequestRow[]; page: number; pageSize: number }> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 25, 100);
    const items = await this.schedulingRepository.listPendingTimeOffForReview({
      recruiterId: params.recruiterId,
      workSiteId: params.workSiteId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { items, page, pageSize };
  }

  /**
   * Phase 3 — Approve pending_review request; audit; liaison PACR email when applicable.
   */
  async approveRequest(_id: string): Promise<void> {
    // Not implemented.
  }

  /**
   * Phase 3 — Deny with required review_notes; audit; notify provider.
   */
  async denyRequest(_id: string, _dto: DenyRequestDto): Promise<void> {
    // Not implemented.
  }

  /** Phase 3 — CorporatePTOCalendar. */
  async getPtoCalendar(_workSiteId: string, _monthYear: string): Promise<void> {
    // Not implemented.
  }

  /** Phase 3 — CorporateAvailabilityCalendar. */
  async getAvailabilityCalendar(_workSiteId: string, _monthYear: string): Promise<void> {
    // Not implemented.
  }

  /** Phase 3 — CorporatePRNAvailability. */
  async getPrnAvailabilityCalendar(_workSiteId: string, _monthYear: string): Promise<void> {
    // Not implemented.
  }

  /** Phase 3–4 — ACE/IMO Excel export (one sheet per recruiter). */
  async exportAceImo(_dto: AceImoExportDto): Promise<void> {
    // Not implemented.
  }

  /** Phase 4 — Write schedule_finalizations; notify providers. */
  async finalizeMonth(_dto: FinalizeMonthDto): Promise<void> {
    // Not implemented.
  }

  /** Phase 4 — useScheduleFinalized read for corporate/PRN gating. */
  async getFinalizationStatus(_workSiteId: string, _monthYear: string): Promise<void> {
    // Not implemented.
  }
}
