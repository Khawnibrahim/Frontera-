import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('Admin — Documents')
@Controller('admin/documents')
export class AdminDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id/download')
  @ApiOperation({ summary: 'Presigned URL to download PACR or other document' })
  getDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getDownloadUrl(id);
  }
}
