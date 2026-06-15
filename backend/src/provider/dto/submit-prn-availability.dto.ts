import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class PrnAvailabilityDayDto {
  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  requestDate!: string;

  @ApiProperty({ example: '8:00 AM' })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '5:00 PM' })
  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsUUID()
  workSiteId!: string;
}

export class SubmitPrnAvailabilityDto {
  @ApiProperty({ example: '2026-06-01', description: 'First day of target month' })
  @IsDateString()
  monthYear!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  noChanges?: boolean;

  @ApiPropertyOptional({ description: 'Required when target month is past submission deadline' })
  @IsOptional()
  @IsUUID()
  pacrDocumentId?: string;

  @ApiPropertyOptional({ type: [PrnAvailabilityDayDto] })
  @ValidateIf((o) => !o.noChanges)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrnAvailabilityDayDto)
  days?: PrnAvailabilityDayDto[];
}
