import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5001;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}
try {
  await connectDB();
  const server = app.listen(PORT, () => console.log(`SpendWise AI API running at http://localhost:${PORT}`));
  const shutdown = async () => { console.log('Shutting down...'); server.close(async () => { const mongoose = await import('mongoose'); await mongoose.default.connection.close(); process.exit(0); }); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
}
