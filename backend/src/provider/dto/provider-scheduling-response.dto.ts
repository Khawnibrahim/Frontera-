import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProviderWorkSiteDto {
  @ApiProperty()
  workSiteId!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiProperty()
  isPrimary!: boolean;
}

export class ProviderSchedulingContextDto {
  @ApiPropertyOptional()
  fullName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiProperty({ example: 'prn' })
  scheduleType!: string;

  @ApiPropertyOptional()
  recruiterName?: string | null;

  @ApiPropertyOptional()
  liaisonName?: string | null;

  @ApiPropertyOptional({ example: 'Optum' })
  clientName?: string | null;

  @ApiProperty({ type: [ProviderWorkSiteDto] })
  workSites!: ProviderWorkSiteDto[];
}

export class ProviderPrnMonthSubmissionDto {
  @ApiProperty()
  monthlyRequestId!: string;

  @ApiProperty({ example: '2026-06-01' })
  monthYear!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  deadline!: string;

  @ApiPropertyOptional()
  submittedAt?: string | null;

  @ApiProperty()
  noChanges!: boolean;
}

export class ProviderPrnAvailabilityDayDto {
  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  requestDate!: string;

  @ApiPropertyOptional()
  startTime?: string | null;

  @ApiPropertyOptional()
  endTime?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  workSiteId?: string | null;

  @ApiProperty()
  changeType!: string;

  @ApiProperty()
  status!: string;
}

export class ProviderPrnAvailabilityMonthDto {
  @ApiProperty()
  monthYear!: string;

  @ApiProperty()
  deadline!: string;

  @ApiProperty()
  isPastDeadline!: boolean;

  @ApiProperty()
  pacrRequired!: boolean;

  @ApiPropertyOptional({ type: ProviderPrnMonthSubmissionDto })
  monthlyRequest?: ProviderPrnMonthSubmissionDto | null;

  @ApiProperty({ type: [ProviderPrnAvailabilityDayDto] })
  days!: ProviderPrnAvailabilityDayDto[];
}

export class SubmitPrnAvailabilityResponseDto {
  @ApiProperty()
  monthlyRequestId!: string;

  @ApiProperty()
  submissionGroupId!: string;

  @ApiProperty()
  dayCount!: number;

  @ApiProperty({ example: 'submitted' })
  status!: string;
}

export class PacrUploadResponseDto {
  @ApiProperty({ description: 'Use as pacrDocumentId on availability submit' })
  documentId!: string;
}

export class ProviderSetTimeOffDayDto {
  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  requestDate!: string;

  @ApiPropertyOptional()
  startTime?: string | null;

  @ApiPropertyOptional()
  endTime?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  workSiteId?: string | null;

  @ApiProperty()
  changeType!: string;

  @ApiProperty()
  status!: string;
}

export class ProviderSetTimeOffMonthDto {
  @ApiProperty()
  monthYear!: string;

  @ApiProperty()
  deadline!: string;

  @ApiProperty()
  isPastDeadline!: boolean;

  @ApiProperty()
  pacrRequired!: boolean;

  @ApiPropertyOptional({ type: ProviderPrnMonthSubmissionDto })
  monthlyRequest?: ProviderPrnMonthSubmissionDto | null;

  @ApiProperty({ description: 'Primary site weekly pattern from onboarding' })
  weeklySchedule!: unknown;

  @ApiProperty({ type: [ProviderSetTimeOffDayDto] })
  days!: ProviderSetTimeOffDayDto[];
}

export class SubmitSetTimeOffResponseDto {
  @ApiProperty()
  monthlyRequestId!: string;

  @ApiProperty()
  submissionGroupId!: string;

  @ApiProperty()
  dayCount!: number;

  @ApiProperty({ example: 'submitted' })
  status!: string;
}
