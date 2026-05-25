import { Module } from '@nestjs/common';
import { AdminOnboardingController } from './admin-onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  controllers: [AdminOnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
