import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repository/repository.module';
import { AdminSchedulingController } from './admin/admin-scheduling.controller';
import { AdminSchedulingService } from './admin/admin-scheduling.service';
import { ProviderSchedulingController } from './provider/provider-scheduling.controller';
import { ProviderSchedulingService } from './provider/provider-scheduling.service';

@Module({
  imports: [RepositoryModule],
  controllers: [AdminSchedulingController, ProviderSchedulingController],
  providers: [AdminSchedulingService, ProviderSchedulingService],
  exports: [AdminSchedulingService, ProviderSchedulingService],
})
export class SchedulingModule {}
