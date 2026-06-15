import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class ApproveScheduleChangeDto {
  @ApiPropertyOptional({ description: 'Reviewer user id until JWT guard ships' })
  @IsOptional()
  @IsUUID()
  reviewedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({
    description: 'When true, writes startTime/endTime on the request (partial-day approval)',
  })
  @IsOptional()
  @IsBoolean()
  adjustHours?: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  startTime?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  endTime?: string;
}

export class DenyScheduleChangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewedBy?: string;

  @ApiProperty({ description: 'Required denial reason shown to the provider' })
  @IsString()
  @MinLength(1)
  reviewNotes!: string;
}

export class BulkScheduleChangeDecisionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  requestIds!: string[];

  @ApiProperty({ enum: ['approved', 'denied'] })
  @IsIn(['approved', 'denied'])
  decision!: 'approved' | 'denied';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewedBy?: string;

  @ApiPropertyOptional({ description: 'Required when decision is denied' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
