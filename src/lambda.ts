import type { Context, Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { createApp } from './main';

let cachedServer: Handler | null = null;

async function bootstrapServer(): Promise<Handler> {
  const app = await createApp();
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export const handler: Handler = async (event, context: Context, callback) => {
  cachedServer ??= await bootstrapServer();
  return cachedServer(event, context, callback);
};
