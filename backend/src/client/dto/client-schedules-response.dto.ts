import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ClientSchedulesQueryDto {
  @ApiProperty({ example: '2026-06-01', description: 'First day of target month (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  monthYear!: string;
}

export class ClientScheduleShiftDto {
  @ApiProperty({ example: 'Mon' })
  day!: string;

  @ApiProperty({ example: '08:00' })
  start!: string;

  @ApiProperty({ example: '17:00' })
  end!: string;
}

export class ClientScheduleSiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  state!: string | null;
}

export class ClientScheduleRowDto {
  @ApiProperty()
  providerUserId!: string;

  @ApiPropertyOptional({ nullable: true })
  fullName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  specialty!: string | null;

  @ApiPropertyOptional({ nullable: true })
  region!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recruiterName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recruiterEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  recruiterPhone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  liaisonName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  liaisonEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  liaisonPhone!: string | null;

  @ApiProperty({ type: ClientScheduleSiteDto })
  site!: ClientScheduleSiteDto;

  @ApiProperty({ type: [ClientScheduleShiftDto] })
  weeklySchedule!: ClientScheduleShiftDto[];

  @ApiProperty({ type: [String], description: 'Non-denied time-off dates in month (YYYY-MM-DD)' })
  timeOffDates!: string[];
}

export class ClientSchedulesResponseDto {
  @ApiProperty({ example: '2026-06-01' })
  monthYear!: string;

  @ApiProperty({ type: [ClientScheduleRowDto] })
  rows!: ClientScheduleRowDto[];
}
