import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadDocumentDto } from '../scheduling/dto/upload-document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Provider — Documents')
@Controller('provider/documents')
export class ProviderDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Register PACR after S3 upload' })
  registerUpload(@Body() dto: UploadDocumentDto) {
    return this.documentsService.registerUpload(dto);
  }
}
