import { Module } from '@nestjs/common';
import { AdminDocumentsController } from './admin-documents.controller';
import { DocumentsService } from './documents.service';
import { ProviderDocumentsController } from './provider-documents.controller';

@Module({
  controllers: [AdminDocumentsController, ProviderDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
