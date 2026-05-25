import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from './documents/documents.module';
import { MainController } from './main.controller';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AwsModule } from './repository/aws/aws.module';
import { RepositoryModule } from './repository/repository.module';
import { SchedulingModule } from './scheduling/scheduling.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RepositoryModule,
    AwsModule,
    OnboardingModule,
    SchedulingModule,
    DocumentsModule,
  ],
  controllers: [MainController],
})
export class AppModule {}
