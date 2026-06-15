import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApproveScheduleChangeDto,
  BulkScheduleChangeDecisionDto,
  DenyScheduleChangeDto,
} from './dto/schedule-change-decision.dto';
import {
  ScheduleChangeApprovalsListQueryDto,
  ScheduleChangeApprovalsQueryDto,
} from './dto/schedule-change-approvals-query.dto';
import {
  BulkDecisionResponseDto,
  PacrDocumentResponseDto,
  ScheduleChangeFilterOptionsDto,
  ScheduleChangeListResponseDto,
  ScheduleChangeRequestDto,
  ScheduleChangeSummaryDto,
} from './dto/schedule-change-approvals-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ScheduleChangeApprovalsService } from './schedule-change-approvals.service';

@ApiTags('Admin — Schedule Change Approvals')
@Roles('admin', 'internal_staff')
@Controller('admin/schedule-change-approvals')
export class ScheduleChangeApprovalsController {
  constructor(private readonly service: ScheduleChangeApprovalsService) {}

  @Get('filter-options')
  @ApiOperation({ summary: 'Liaison and region dropdowns for the approvals filter bar' })
  @ApiQuery({ name: 'company', required: true, example: 'Frontera' })
  @ApiOkResponse({ type: ScheduleChangeFilterOptionsDto })
  getFilterOptions(@Query('company') company: string) {
    return this.service.getFilterOptions(company);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Pending count for List (N pending) tab header' })
  @ApiOkResponse({ type: ScheduleChangeSummaryDto })
  getSummary(@Query() query: ScheduleChangeApprovalsQueryDto) {
    return this.service.getSummary(query);
  }

  @Get('list')
  @ApiOperation({
    summary: 'List view — groups by provider × month with day lines and overload warning',
  })
  @ApiOkResponse({ type: ScheduleChangeListResponseDto })
  getList(@Query() query: ScheduleChangeApprovalsListQueryDto) {
    return this.service.getList(query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Calendar view — month grid with status chips per day' })
  getCalendar(@Query() query: ScheduleChangeApprovalsQueryDto) {
    return this.service.getCalendar(query);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Single request for review dialog' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ScheduleChangeRequestDto })
  getRequest(@Param('id') id: string) {
    return this.service.getRequest(id);
  }

  @Get('requests/:id/pacr')
  @ApiOperation({ summary: 'PACR document metadata and S3 presigned download URL' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PacrDocumentResponseDto })
  getPacr(@Param('id') id: string) {
    return this.service.getPacrDocument(id);
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve one pending request (optional hour adjustment)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  approve(@Param('id') id: string, @Body() body: ApproveScheduleChangeDto) {
    return this.service.approve(id, body);
  }

  @Post('requests/:id/deny')
  @ApiOperation({ summary: 'Deny one pending request (reviewNotes required)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  deny(@Param('id') id: string, @Body() body: DenyScheduleChangeDto) {
    return this.service.deny(id, body);
  }

  @Post('bulk-decide')
  @ApiOperation({ summary: 'Approve or deny multiple pending requests' })
  @ApiCreatedResponse({ type: BulkDecisionResponseDto })
  bulkDecide(@Body() body: BulkScheduleChangeDecisionDto) {
    return this.service.bulkDecide(body);
  }
}
