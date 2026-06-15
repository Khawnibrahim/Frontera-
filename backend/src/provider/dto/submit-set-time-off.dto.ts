import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const SET_TIME_OFF_CHANGE_TYPES = ['remove_day', 'modify_shift', 'swap'] as const;

export class SetTimeOffDayDto {
  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  requestDate!: string;

  @ApiProperty({ enum: SET_TIME_OFF_CHANGE_TYPES })
  @IsString()
  @IsIn([...SET_TIME_OFF_CHANGE_TYPES])
  changeType!: (typeof SET_TIME_OFF_CHANGE_TYPES)[number];

  @ApiProperty()
  @IsUUID()
  workSiteId!: string;

  @ApiPropertyOptional({ example: '8:00 AM', description: 'Required for modify_shift and swap' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '5:00 PM', description: 'Required for modify_shift and swap' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitSetTimeOffDto {
  @ApiProperty({ example: '2026-06-01', description: 'First day of target month' })
  @IsDateString()
  monthYear!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Confirm no schedule changes needed for the target month',
  })
  @IsOptional()
  @IsBoolean()
  noChanges?: boolean;

  @ApiPropertyOptional({ description: 'Required when target month is past submission deadline' })
  @IsOptional()
  @IsUUID()
  pacrDocumentId?: string;

  @ApiPropertyOptional({ type: [SetTimeOffDayDto] })
  @ValidateIf((o) => !o.noChanges)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SetTimeOffDayDto)
  days?: SetTimeOffDayDto[];
}
