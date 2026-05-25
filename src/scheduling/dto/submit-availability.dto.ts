import { ApiPropertyOptional } from '@nestjs/swagger';

/** Phase 2 — PRN monthly grid batch submit (one row per day → time_off_requests). */
export class SubmitAvailabilityDto {
  @ApiPropertyOptional({ description: 'Target month (YYYY-MM-01)' })
  monthYear?: string;

  @ApiPropertyOptional()
  workSiteId?: string;
}
