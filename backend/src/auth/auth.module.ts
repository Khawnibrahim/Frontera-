import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TOKENS } from '../config/tokens';
import { RepositoryModule } from '../repository/repository.module';
import { AuthRepository } from './auth.repository';
import { ProviderSelfGuard } from './guards/provider-self.guard';
import { RolesGuard } from './guards/roles.guard';
import { SupabaseJwtGuard } from './guards/supabase-jwt.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

@Module({
  imports: [ConfigModule, RepositoryModule],
  providers: [
    AuthRepository,
    {
      provide: TOKENS.AuthRepository,
      useExisting: AuthRepository,
    },
    {
      provide: TOKENS.AuthRepositoryLogger,
      useFactory: () => new Logger(AuthRepository.name),
    },
    SupabaseJwtService,
    {
      provide: TOKENS.SupabaseJwtService,
      useExisting: SupabaseJwtService,
    },
    ProviderSelfGuard,
    {
      provide: APP_GUARD,
      useClass: SupabaseJwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [TOKENS.SupabaseJwtService, ProviderSelfGuard],
})
export class AuthModule {}
