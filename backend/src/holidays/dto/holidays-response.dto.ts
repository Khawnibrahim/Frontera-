import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class HolidaysQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Inclusive start date (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Inclusive end date (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class HolidayDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '2026-12-25' })
  holidayDate!: string;

  @ApiProperty()
  year!: number;
}

export class HolidaysListResponseDto {
  @ApiProperty({ type: [HolidayDto] })
  items!: HolidayDto[];
}
