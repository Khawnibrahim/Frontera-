import { Module } from '@nestjs/common';
import { RepositoryModule } from '../../repository/repository.module';
import { PrnAvailabilityController } from './prn-availability.controller';
import { PrnAvailabilityService } from './prn-availability.service';

@Module({
  imports: [RepositoryModule],
  controllers: [PrnAvailabilityController],
  providers: [PrnAvailabilityService],
  exports: [PrnAvailabilityService],
})
export class PrnAvailabilityModule {}
