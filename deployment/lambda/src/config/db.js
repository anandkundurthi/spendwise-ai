
import mongoose from 'mongoose';

let connectionPromise;

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not configured.');
  }

  mongoose.set('strictQuery', true);

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });

  try {
    await connectionPromise;
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } finally {
    connectionPromise = undefined;
  }
}
