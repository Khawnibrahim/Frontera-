import { ApiPropertyOptional } from '@nestjs/swagger';

/** CorporateOnboardProvider — identity, sites, recruiter, liaison (Phase 1). */
export class CreateProviderDto {
  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  fullName?: string;
}
