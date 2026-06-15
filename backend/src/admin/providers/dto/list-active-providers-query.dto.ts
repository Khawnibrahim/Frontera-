import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

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

export class ListActiveProvidersQueryDto {
  @ApiPropertyOptional({ description: 'Search name, email, or external provider id' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Single recruiter UUID (prefer recruiterIds)' })
  @IsOptional()
  @IsUUID()
  recruiterId?: string;

  @ApiPropertyOptional({ type: [String], description: 'One or more recruiter UUIDs' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  recruiterIds?: string[];

  @ApiPropertyOptional({ description: 'Single liaison UUID (prefer liaisonIds)' })
  @IsOptional()
  @IsUUID()
  liaisonId?: string;

  @ApiPropertyOptional({ type: [String], description: 'One or more liaison UUIDs' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  liaisonIds?: string[];

  @ApiPropertyOptional({ example: 'TX', description: 'Single state (prefer states)' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ type: [String], description: 'One or more states' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ example: 'Dallas', description: 'Single city (prefer cities)' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ type: [String], description: 'One or more cities' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ example: 'South', description: 'Single region (prefer regions)' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ type: [String], description: 'One or more regions' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ example: 'Family Medicine', description: 'Single specialty (prefer specialties)' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ type: [String], description: 'One or more specialties' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ example: 'W2', description: 'Single employment type (prefer employmentTypes)' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ type: [String], description: 'One or more employment types (W2, 1099)' })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  employmentTypes?: string[];

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
