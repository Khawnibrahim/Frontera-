import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  PrnAvailabilityQueryDto,
  PrnAvailabilityQueueQueryDto,
} from './dto/prn-availability-query.dto';
import {
  PrnAvailabilityFilterOptionsDto,
  PrnAvailabilityQueueResponseDto,
  PrnAvailabilitySummaryDto,
} from './dto/prn-availability-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrnAvailabilityService } from './prn-availability.service';

@ApiTags('Admin — PRN Availability')
@Roles('admin', 'internal_staff')
@Controller('admin/prn-availability')
export class PrnAvailabilityController {
  constructor(private readonly service: PrnAvailabilityService) {}

  @Get('filter-options')
  @ApiOperation({ summary: 'Liaison and region dropdowns for PRN availability filters' })
  @ApiQuery({ name: 'company', required: true, example: 'Frontera' })
  @ApiOkResponse({ type: PrnAvailabilityFilterOptionsDto })
  getFilterOptions(@Query('company') company: string) {
    return this.service.getFilterOptions(company);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Count of monthly PRN submissions awaiting review' })
  @ApiOkResponse({ type: PrnAvailabilitySummaryDto })
  getSummary(@Query() query: PrnAvailabilityQueryDto) {
    return this.service.getSummary(query);
  }

  @Get('queue')
  @ApiOperation({
    summary: 'Queue view — PRN submissions grouped by provider × month with day lines',
  })
  @ApiOkResponse({ type: PrnAvailabilityQueueResponseDto })
  getQueue(@Query() query: PrnAvailabilityQueueQueryDto) {
    return this.service.getQueue(query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Calendar view — month grid of PRN availability day rows' })
  getCalendar(@Query() query: PrnAvailabilityQueryDto) {
    return this.service.getCalendar(query);
  }
}
