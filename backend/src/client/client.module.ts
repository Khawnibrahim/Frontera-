import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repository/repository.module';
import { ClientSchedulesController } from './client-schedules.controller';
import { ClientSchedulesService } from './client-schedules.service';

@Module({
  imports: [RepositoryModule],
  controllers: [ClientSchedulesController],
  providers: [ClientSchedulesService],
})
export class ClientModule {}
