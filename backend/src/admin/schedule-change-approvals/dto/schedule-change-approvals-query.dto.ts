import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value.flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export class ScheduleChangeApprovalsQueryDto {
  @ApiProperty({ example: 'Frontera', description: 'Company toggle (Frontera | 4tress)' })
  @IsString()
  company!: string;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'First day of month; list without = all months in range',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  monthYear?: string;

  @ApiPropertyOptional({
    description: 'One or more liaison UUIDs (comma-separated or repeated)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  liaisonIds?: string[];

  @ApiPropertyOptional({
    description: 'One or more regions (comma-separated or repeated)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ description: 'Search provider name, email, or external id' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class ScheduleChangeApprovalsListQueryDto extends ScheduleChangeApprovalsQueryDto {
  @ApiPropertyOptional({
    description: 'When true, only groups with at least one pending day',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  pendingOnly?: boolean;
}
