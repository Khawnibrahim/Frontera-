import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

config();

const databaseUrl = process.env.DATABASE_URL ?? '';
const useSsl =
  databaseUrl.length > 0 &&
  !databaseUrl.includes('localhost') &&
  !databaseUrl.includes('127.0.0.1');

export default {
  schema: './src/repository/persistence/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
} satisfies Config;
