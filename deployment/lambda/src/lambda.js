import 'dotenv/config';
import serverlessExpress from '@codegenie/serverless-express';
import app from './app.js';
import { connectDB } from './config/db.js';

let initializationPromise;

async function initialize() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }

  await connectDB();

  return serverlessExpress({ app });
}

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!initializationPromise) {
    initializationPromise = initialize().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }

  const serverlessHandler = await initializationPromise;
  return serverlessHandler(event, context);
};
