import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SubmitAvailabilityDto } from '../dto/submit-availability.dto';
import { SubmitTimeOffDto } from '../dto/submit-time-off.dto';
import { ProviderSchedulingService } from './provider-scheduling.service';

@ApiTags('Provider — Scheduling')
@Controller('provider/scheduling')
export class ProviderSchedulingController {
  constructor(private readonly providerSchedulingService: ProviderSchedulingService) {}

  @Post('availability/submit')
  @ApiOperation({ summary: 'Submit PRN monthly availability' })
  submitAvailability(@Body() dto: SubmitAvailabilityDto) {
    return this.providerSchedulingService.submitAvailability(dto);
  }

  @Post('time-off')
  @ApiOperation({ summary: 'Submit set-schedule time-off / change request' })
  submitTimeOff(@Body() dto: SubmitTimeOffDto) {
    return this.providerSchedulingService.submitTimeOff(dto);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Provider schedule for a month' })
  @ApiQuery({ name: 'monthYear', required: true })
  @ApiQuery({ name: 'workSiteId', required: false })
  getSchedule(@Query('monthYear') monthYear: string, @Query('workSiteId') workSiteId?: string) {
    return this.providerSchedulingService.getSchedule(monthYear, workSiteId);
  }

  @Get('finalized')
  @ApiOperation({ summary: 'Whether month is finalized for a work site' })
  @ApiQuery({ name: 'workSiteId', required: true })
  @ApiQuery({ name: 'monthYear', required: true })
  getFinalizationStatus(
    @Query('workSiteId') workSiteId: string,
    @Query('monthYear') monthYear: string,
  ) {
    return this.providerSchedulingService.getFinalizationStatus(workSiteId, monthYear);
  }
}
