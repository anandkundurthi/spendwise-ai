# SpendWise AI — Product Blueprint

## Vision
A thoughtful personal finance companion that helps people understand real spending, plan affordable purchases and make room for what matters without judgment.

## MVP modules
1. Secure account registration and login.
2. Manual income and expense transactions.
3. Monthly category budgets.
4. Savings goals.
5. Dashboard with recorded income, expenses, net and category totals.
6. Financial chat grounded in the authenticated user's current-month records.

## Planned next modules
- CSV bank statement import with duplicate detection and import preview.
- PDF statement extraction with user confirmation.
- Receipt OCR with confirmation before saving.
- Affordability scenarios using deterministic calculations.
- Recurring payment detection.
- Monthly cash-flow forecast with explicit assumptions.
- Account Aggregator integration through an authorized provider, subject to onboarding and consent.
- Vector retrieval only when a concrete semantic retrieval need is established.

## Product principles
- Human-centred, non-judgmental language.
- Financial arithmetic belongs in deterministic backend code.
- AI outputs are suggestions, not authoritative financial records.
- Users confirm uncertain extracted or categorized data.
- No collection of UPI PINs, banking passwords or OTPs.
- Financial records are always scoped to the authenticated user.

## Architecture
React/Vite client -> Express REST API -> authentication middleware -> domain routes/services -> MongoDB/Mongoose. The AI route retrieves only the signed-in user's aggregate financial context and optionally calls an LLM provider from the server.
