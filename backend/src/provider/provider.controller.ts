import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProviderSelfGuard } from '../auth/guards/provider-self.guard';
import { AppErrors } from '../common/errors/app-errors';
import { SubmitPrnAvailabilityDto } from './dto/submit-prn-availability.dto';
import { SubmitSetTimeOffDto } from './dto/submit-set-time-off.dto';
import {
  PacrUploadResponseDto,
  ProviderPrnAvailabilityMonthDto,
  ProviderSchedulingContextDto,
  ProviderSetTimeOffMonthDto,
  SubmitPrnAvailabilityResponseDto,
  SubmitSetTimeOffResponseDto,
} from './dto/provider-scheduling-response.dto';
import { PacrDocumentDownloadDto } from '../documents/dto/pacr-document-download.dto';
import { ProviderDocumentsService } from './provider-documents.service';
import { ProviderSchedulingService } from './provider-scheduling.service';

@ApiTags('Provider')
@ApiParam({
  name: 'providerId',
  description: 'Provider user id (profiles.user_id)',
})
@Roles('provider_user', 'admin')
@UseGuards(ProviderSelfGuard)
@Controller('provider/:providerId')
export class ProviderController {
  constructor(
    private readonly scheduling: ProviderSchedulingService,
    private readonly documents: ProviderDocumentsService,
  ) {}

  @Get('scheduling/context')
  @ApiOperation({
    summary: 'Recruiter, liaison, client, and work sites (Availability Calendar header)',
  })
  @ApiOkResponse({ type: ProviderSchedulingContextDto })
  getContext(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.scheduling.getContext(providerId);
  }

  @Get('scheduling/availability')
  @ApiOperation({ summary: 'PRN month calendar — existing submission and days' })
  @ApiQuery({ name: 'monthYear', required: true, example: '2026-08-01' })
  @ApiOkResponse({ type: ProviderPrnAvailabilityMonthDto })
  getAvailability(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Query('monthYear') monthYear: string,
  ) {
    if (!monthYear?.trim()) {
      throw AppErrors.monthYearRequired();
    }
    return this.scheduling.getAvailability(providerId, monthYear.trim());
  }

  @Post('scheduling/availability/submit')
  @ApiOperation({ summary: 'PRN batch submit monthly availability for liaison review' })
  @ApiOkResponse({ type: SubmitPrnAvailabilityResponseDto })
  submitAvailability(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: SubmitPrnAvailabilityDto,
  ) {
    return this.scheduling.submitAvailability(providerId, dto);
  }

  @Get('scheduling/time-off')
  @ApiOperation({ summary: 'SET schedule — load monthly time-off requests and weekly baseline' })
  @ApiQuery({ name: 'monthYear', required: true, example: '2026-08-01' })
  @ApiOkResponse({ type: ProviderSetTimeOffMonthDto })
  getTimeOff(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Query('monthYear') monthYear: string,
  ) {
    if (!monthYear?.trim()) {
      throw AppErrors.monthYearRequired();
    }
    return this.scheduling.getTimeOff(providerId, monthYear.trim());
  }

  @Post('scheduling/time-off/submit')
  @ApiOperation({ summary: 'SET schedule — batch submit time-off / schedule changes for review' })
  @ApiOkResponse({ type: SubmitSetTimeOffResponseDto })
  submitTimeOff(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: SubmitSetTimeOffDto,
  ) {
    return this.scheduling.submitTimeOff(providerId, dto);
  }

  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload PACR PDF (late SET/PRN schedule submit)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: PacrUploadResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  uploadPacr(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    return this.documents.uploadPacr(providerId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  @Get('documents/:documentId')
  @ApiOperation({ summary: 'PACR document metadata and S3 presigned download URL' })
  @ApiParam({ name: 'documentId', format: 'uuid' })
  @ApiOkResponse({ type: PacrDocumentDownloadDto })
  getPacrDocument(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documents.getPacrDownload(providerId, documentId);
  }
}
