import { ApiPropertyOptional } from '@nestjs/swagger';

/** Phase 3 — Deny requires review_notes visible to provider. */
export class DenyRequestDto {
  @ApiPropertyOptional()
  reviewNotes?: string;
}
