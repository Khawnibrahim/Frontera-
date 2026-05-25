import { ApiPropertyOptional } from '@nestjs/swagger';

/** Phase 3–4 — ACE/IMO Excel export (one sheet per recruiter). */
export class AceImoExportDto {
  @ApiPropertyOptional({ description: 'Month (YYYY-MM-01)' })
  monthYear?: string;

  @ApiPropertyOptional({ type: [String] })
  workSiteIds?: string[];
}
