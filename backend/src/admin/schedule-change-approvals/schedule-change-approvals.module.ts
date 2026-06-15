import { Module } from '@nestjs/common';
import { DocumentsModule } from '../../documents/documents.module';
import { AwsModule } from '../../repository/aws/aws.module';
import { RepositoryModule } from '../../repository/repository.module';
import { ScheduleChangeApprovalsController } from './schedule-change-approvals.controller';
import { ScheduleChangeApprovalsService } from './schedule-change-approvals.service';

@Module({
  imports: [RepositoryModule, AwsModule, DocumentsModule],
  controllers: [ScheduleChangeApprovalsController],
  providers: [ScheduleChangeApprovalsService],
  exports: [ScheduleChangeApprovalsService],
})
export class ScheduleChangeApprovalsModule {}
