import { ApiPropertyOptional } from '@nestjs/swagger';

/** Phase 2 — PACR PDF metadata after client upload to S3. */
export class UploadDocumentDto {
  @ApiPropertyOptional()
  timeOffRequestId?: string;

  @ApiPropertyOptional()
  storagePath?: string;

  @ApiPropertyOptional({ default: 'pacr' })
  category?: string;
}
