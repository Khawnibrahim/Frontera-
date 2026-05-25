import { ApiPropertyOptional } from '@nestjs/swagger';

/** Phase 2 — Set-schedule change request (single day or small batch). */
export class SubmitTimeOffDto {
  @ApiPropertyOptional()
  workSiteId?: string;

  @ApiPropertyOptional()
  requestDate?: string;

  @ApiPropertyOptional()
  changeType?: string;
}
