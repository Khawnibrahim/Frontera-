import type { Context, Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { createApp } from './main';

let cachedServer: Handler | null = null;

/** MIME types returned as raw bytes (Excel exports, future PDFs, etc.). */
const BINARY_RESPONSE_CONTENT_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

async function bootstrapServer(): Promise<Handler> {
  const app = await createApp();
  await app.init();
  return serverlessExpress({
    app: app.getHttpAdapter().getInstance(),
    binarySettings: { contentTypes: BINARY_RESPONSE_CONTENT_TYPES },
  });
}

export const handler: Handler = async (event, context: Context, callback) => {
  cachedServer ??= await bootstrapServer();
  return cachedServer(event, context, callback);
};
