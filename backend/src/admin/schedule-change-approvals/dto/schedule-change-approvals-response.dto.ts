import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleChangeRequestDto {
  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  providerUserId!: string;

  @ApiProperty()
  providerName!: string;

  @ApiPropertyOptional()
  providerEmail?: string | null;

  @ApiProperty()
  requestDate!: string;

  @ApiPropertyOptional()
  startTime?: string | null;

  @ApiPropertyOptional()
  endTime?: string | null;

  @ApiProperty()
  isUnavailable!: boolean;

  @ApiProperty()
  changeType!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  timeLabel?: string | null;

  @ApiPropertyOptional()
  providerNotes?: string | null;

  @ApiPropertyOptional()
  reviewNotes?: string | null;

  @ApiProperty()
  hasPacr!: boolean;

  @ApiProperty()
  isPastDeadline!: boolean;

  @ApiPropertyOptional()
  pacrDocumentId?: string | null;

  @ApiPropertyOptional({
    description: 'When the provider submitted this change for review (ISO 8601)',
  })
  submittedAt?: string | null;
}

export class ScheduleOverloadWarningDto {
  @ApiProperty()
  requestedOffDays!: number;

  @ApiProperty()
  scheduledWorkdays!: number;

  @ApiProperty()
  percent!: number;

  @ApiProperty()
  label!: string;
}

export class ScheduleChangeProviderGroupDto {
  @ApiProperty()
  providerUserId!: string;

  @ApiProperty()
  providerName!: string;

  @ApiPropertyOptional()
  liaisonName?: string | null;

  @ApiProperty()
  monthYear!: string;

  @ApiProperty()
  monthLabel!: string;

  @ApiProperty()
  dayCount!: number;

  @ApiProperty()
  pendingCount!: number;

  @ApiPropertyOptional({ type: ScheduleOverloadWarningDto })
  scheduleOverloadWarning?: ScheduleOverloadWarningDto | null;

  @ApiProperty({ type: [ScheduleChangeRequestDto] })
  days!: ScheduleChangeRequestDto[];
}

export class ScheduleChangeListResponseDto {
  @ApiProperty()
  company!: string;

  @ApiProperty()
  pendingCount!: number;

  @ApiProperty({ type: [ScheduleChangeProviderGroupDto] })
  groups!: ScheduleChangeProviderGroupDto[];
}

export class ScheduleChangeFilterOptionsDto {
  @ApiProperty({ type: [String] })
  companies!: string[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  liaisons!: { id: string; name: string }[];

  @ApiProperty({ type: [String] })
  regions!: string[];
}

export class ScheduleChangeSummaryDto {
  @ApiProperty()
  pendingCount!: number;
}

export class PacrDocumentResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty({ description: 'S3 presigned GET URL (300s TTL)' })
  downloadUrl!: string;

  @ApiProperty({ description: 'Seconds until the presigned URL expires', example: 300 })
  expiresIn!: number;
}

export class BulkDecisionResponseDto {
  @ApiProperty({ type: [String] })
  updatedIds!: string[];

  @ApiProperty({ type: [String] })
  skippedIds!: string[];

  @ApiProperty()
  notificationsSent!: number;

  @ApiProperty({ type: [String] })
  notificationErrors!: string[];
}
