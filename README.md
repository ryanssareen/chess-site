# Arcade Chess (Training Edition)

Single-user chess training platform optimized for `ryansucksatlifetoo`.

## Highlights
- Password + Firebase Google/Phone login on a custom backend (`/api/auth/*`)
- Access locked to one configured username (`TRAINING_USERNAME`)
- Play only vs computer (multiplayer queue removed)
- Review real Chess.com games with move-by-move board states
- Run engine evaluation on any reviewed position
- Optional frontend-only mode for deployments without a backend

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, TailwindCSS, Zustand, Socket.IO client
- **Backend:** Express, Socket.IO, Prisma/PostgreSQL, chess.js
- **Engine:** Stockfish WASM
- **Auth:** JWT, bcrypt, Firebase Auth (Google provider)

## Setup
1. Copy env vars:
```bash
cp .env.example .env
```
2. Install dependencies:
```bash
npm install --workspaces
```
3. Migrate database:
```bash
cd server
npx prisma migrate dev --name init
```
4. Run:
```bash
npm run dev --workspace server
npm run dev --workspace frontend
```

## Required Env Vars
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `TRAINING_USERNAME` (default: `ryansucksatlifetoo`)
- `CHESS_COM_USERNAME` (default: `ryansucksatlifetoo`)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_TRAINING_USERNAME` (optional UI display override)
- `NEXT_PUBLIC_CHESS_COM_USERNAME` (frontend-only review source)
- `NEXT_PUBLIC_FRONTEND_ONLY=true` (skip backend and run local fallback logic)

## API Snapshot
- `POST /api/auth/register` `{username, password}` -> `{token, user}`
- `POST /api/auth/login` `{username, password}` -> `{token, user}`
- `POST /api/auth/firebase` `{idToken}` -> `{token, user}` (Google or Phone provider)
- `POST /api/auth/google` `{idToken}` -> `{token, user}` (Google-only)
- `POST /api/auth/phone` `{idToken}` -> `{token, user}` (Phone-only)
- `GET /api/auth/me` (auth)
- `POST /api/match/ai` `{level, timeControl}` (auth)
- `POST /api/match/queue` -> `410 Gone` (disabled)
- `GET /api/profile/me` (auth)
- `GET /api/history?limit=20` (auth)
- `GET /api/analysis/review-games?limit=12` (auth)
- `POST /api/analysis/evaluate` `{fen, depth}` (auth)

## Notes
- Socket connections now require JWT auth.
- Game review pulls recent public games from Chess.com API for the configured account.
- Firebase phone login uses SMS verification + reCAPTCHA in the web client.
