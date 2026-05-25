import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AceImoExportDto } from '../dto/ace-imo-export.dto';
import { DenyRequestDto } from '../dto/deny-request.dto';
import { FinalizeMonthDto } from '../dto/finalize-month.dto';
import { AdminSchedulingService } from './admin-scheduling.service';

@ApiTags('Admin — Scheduling')
@Controller('admin/scheduling')
export class AdminSchedulingController {
  constructor(private readonly adminSchedulingService: AdminSchedulingService) {}

  @Get('review-queue')
  @ApiOperation({ summary: 'Corporate review queue (pending_review)' })
  @ApiQuery({ name: 'recruiterId', required: false })
  @ApiQuery({ name: 'workSiteId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  listReviewQueue(
    @Query('recruiterId') recruiterId?: string,
    @Query('workSiteId') workSiteId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminSchedulingService.listPendingReview({
      recruiterId,
      workSiteId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve a pending request' })
  approveRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminSchedulingService.approveRequest(id);
  }

  @Post('requests/:id/deny')
  @ApiOperation({ summary: 'Deny a pending request' })
  denyRequest(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DenyRequestDto) {
    return this.adminSchedulingService.denyRequest(id, dto);
  }

  @Get('calendars/pto')
  @ApiOperation({ summary: 'PTO calendar by work site and month' })
  @ApiQuery({ name: 'workSiteId', required: true })
  @ApiQuery({ name: 'monthYear', required: true })
  getPtoCalendar(@Query('workSiteId') workSiteId: string, @Query('monthYear') monthYear: string) {
    return this.adminSchedulingService.getPtoCalendar(workSiteId, monthYear);
  }

  @Get('calendars/availability')
  @ApiOperation({ summary: 'Set-schedule availability calendar' })
  @ApiQuery({ name: 'workSiteId', required: true })
  @ApiQuery({ name: 'monthYear', required: true })
  getAvailabilityCalendar(
    @Query('workSiteId') workSiteId: string,
    @Query('monthYear') monthYear: string,
  ) {
    return this.adminSchedulingService.getAvailabilityCalendar(workSiteId, monthYear);
  }

  @Get('calendars/prn')
  @ApiOperation({ summary: 'PRN availability calendar' })
  @ApiQuery({ name: 'workSiteId', required: true })
  @ApiQuery({ name: 'monthYear', required: true })
  getPrnAvailabilityCalendar(
    @Query('workSiteId') workSiteId: string,
    @Query('monthYear') monthYear: string,
  ) {
    return this.adminSchedulingService.getPrnAvailabilityCalendar(workSiteId, monthYear);
  }

  @Post('exports/ace-imo')
  @ApiOperation({ summary: 'ACE/IMO Excel export' })
  exportAceImo(@Body() dto: AceImoExportDto) {
    return this.adminSchedulingService.exportAceImo(dto);
  }

  @Post('finalize-month')
  @ApiOperation({ summary: 'Finalize month for a work site' })
  finalizeMonth(@Body() dto: FinalizeMonthDto) {
    return this.adminSchedulingService.finalizeMonth(dto);
  }

  @Get('finalized')
  @ApiOperation({ summary: 'Finalization status for work site + month' })
  @ApiQuery({ name: 'workSiteId', required: true })
  @ApiQuery({ name: 'monthYear', required: true })
  getFinalizationStatus(
    @Query('workSiteId') workSiteId: string,
    @Query('monthYear') monthYear: string,
  ) {
    return this.adminSchedulingService.getFinalizationStatus(workSiteId, monthYear);
  }
}
