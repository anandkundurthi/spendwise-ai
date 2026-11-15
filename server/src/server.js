import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
try {
  await connectDB();
  const server = app.listen(PORT, () => console.log(`SpendWise AI API running at http://localhost:${PORT}`));
  const shutdown = async () => { console.log('Shutting down...'); server.close(async () => { const mongoose = await import('mongoose'); await mongoose.default.connection.close(); process.exit(0); }); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
}
