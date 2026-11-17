import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';
import { fileURLToPath } from 'node:url';

const app = express();

const uploadsDirectory = fileURLToPath(
  new URL('../uploads/', import.meta.url)
);

app.use('/uploads', express.static(uploadsDirectory, {
  setHeaders(res) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.NODE_ENV !== 'production'
    ? [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175'
      ]
    : [])
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
// Protect login attempts without limiting normal application requests.
app.use('/api/v1/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

// Apply a separate limit to account registration.
app.use('/api/v1/auth/register', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));
// Limit repeated profile avatar uploads.
app.use('/api/v1/auth/profile/avatar', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));
app.get('/api/v1/health', (_req, res) => res.json({ success: true, application: 'SpendWise AI', status: 'healthy', timestamp: new Date().toISOString() }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message || 'Internal server error.' }); });
export default app;
