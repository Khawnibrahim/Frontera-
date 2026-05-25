import { ApiPropertyOptional } from '@nestjs/swagger';

/** Phase 4 — Lock month for a work site (schedule_finalizations). */
export class FinalizeMonthDto {
  @ApiPropertyOptional()
  workSiteId?: string;

  @ApiPropertyOptional({ description: 'Month (YYYY-MM-01)' })
  monthYear?: string;
}
