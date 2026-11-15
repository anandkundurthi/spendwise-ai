# SpendWise AI

A human-centred, India-first personal finance companion built with React, Express, MongoDB and optional LLM integration.

## What is included

- React + Vite responsive frontend with a warm, human-centred design
- Express REST API
- MongoDB/Mongoose models
- Registration, login and JWT-protected APIs
- Income and expense transaction management
- Monthly category budgets
- Savings goals
- Dashboard summary and spending categories
- AI chat endpoint grounded in the signed-in user's recorded monthly financial totals and categories
- Optional OpenAI-compatible chat completion integration (server-side only)
- Security middleware, request rate limiting and Zod validation

## Important scope notes

This is a runnable MVP foundation, not a production-certified financial product. It does not connect directly to UPI apps or banks. For now, users enter transactions manually. Bank statement CSV/PDF imports and authorized Account Aggregator integrations are planned extensions and require provider-specific implementation, onboarding, consent and compliance review. Never collect UPI PINs, OTPs or banking passwords.

The spending chart currently uses illustrative chart points when a user has recorded expenses; replace this with a real date-bucket aggregation before treating it as an accurate daily trend. The MVP dashboard totals and category totals are calculated from MongoDB records.

## Requirements

- Node.js 20+ (Node 22 LTS recommended)
- npm 10+
- MongoDB Atlas connection string or local MongoDB

## Setup

1. Extract the ZIP.
2. Open a terminal in the extracted `spendwise-ai` directory.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create the backend environment file:

   ```bash
   cp server/.env.example server/.env
   ```

5. Edit `server/.env` and set `MONGODB_URI` and a long random `JWT_SECRET` (at least 32 characters). For MongoDB Atlas, use the connection string from your own Atlas project and allow your development IP in Network Access.
6. Optional: set `OPENAI_API_KEY` to enable model-backed AI chat. Without it, the app uses a clearly labelled basic deterministic response based on saved financial data.
7. Start frontend and backend:

   ```bash
   npm run dev
   ```

8. Open `http://localhost:5173`. The API health check is `http://localhost:5000/api/v1/health`.

## First use

- Create an account.
- Add income and expense transactions.
- Create a few category budgets and a savings goal.
- Open Ask SpendWise and ask questions about your recorded month.

## Environment variables

See `server/.env.example`. Never commit `.env` files or expose provider keys through `VITE_` variables.

## Project structure

```text
client/       React application
server/       Express API and Mongoose models
  src/config  Database connection
  src/models  User, Transaction, Budget and Goal
  src/routes  Auth, transactions, budgets, goals, dashboard and AI
  src/services Planned extension point for financial and AI services
docs/         Product and architecture documentation
```

## Before public deployment

- Configure production secrets and HTTPS.
- Add email verification, password reset and stronger session management.
- Add automated unit, integration and authorization-isolation tests.
- Implement real CSV/PDF import with robust parsing, validation and idempotency.
- Replace the illustrative chart with database-derived time-series data.
- Add user data export/deletion and privacy disclosures.
- Conduct security and privacy reviews.
- Review all applicable Indian data protection and financial-sector requirements before any real financial data integrations.
