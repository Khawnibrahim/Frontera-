import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TOKENS } from '../../config/tokens';
import { SesGateway } from './ses.gateway';

@Module({
  imports: [ConfigModule],
  providers: [
    SesGateway,
    {
      provide: TOKENS.SesGateway,
      useExisting: SesGateway,
    },
    {
      provide: TOKENS.SesGatewayLogger,
      useFactory: () => new Logger(SesGateway.name),
    },
  ],
  exports: [TOKENS.SesGateway],
})
export class AwsModule {}
