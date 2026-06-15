import { Module } from '@nestjs/common';
import { AwsModule } from '../repository/aws/aws.module';
import { DocumentDownloadService } from './document-download.service';

@Module({
  imports: [AwsModule],
  providers: [DocumentDownloadService],
  exports: [DocumentDownloadService],
})
export class DocumentsModule {}
