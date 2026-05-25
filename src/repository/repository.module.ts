import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { TOKENS } from '../config/tokens';
import { DbClient } from './persistence/db/db.client';
import { SchedulingRepository } from './persistence/repository';
import * as schema from './persistence/db/schema';

@Module({
  imports: [ConfigModule],
  providers: [
    DbClient,
    {
      provide: TOKENS.DbClient,
      useExisting: DbClient,
    },
    {
      provide: TOKENS.SchedulingRepository,
      useClass: SchedulingRepository,
    },
    {
      provide: TOKENS.SchedulingRepositoryLogger,
      useFactory: () => new Logger(SchedulingRepository.name),
    },
    {
      provide: 'PG_POOL',
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL is required');
        }
        return new Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'DRIZZLE_DB',
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
      inject: ['PG_POOL'],
    },
  ],
  exports: [TOKENS.DbClient, TOKENS.SchedulingRepository],
})
export class RepositoryModule {}
