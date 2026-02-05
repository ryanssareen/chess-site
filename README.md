# Arcade Chess

A modern, full-stack chess platform inspired by Lichess and Chess.com. Supports real-time multiplayer, AI sparring via Stockfish, analysis board, ratings, and player profiles.

## Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Zustand, Socket.IO client, react-chessboard
- **Backend:** Node.js, Express, Socket.IO, Prisma, PostgreSQL, chess.js for server-side validation, JWT auth
- **AI:** Stockfish WASM (server-side) with configurable depth/skill
- **Auth:** JWT + bcrypt password hashing

## Repo Structure
```
/README.md
/.env.example
/frontend/   # Next.js app (UI, boards, profiles)
/server/     # Express + Socket.IO API/real-time server
```

## Setup
1) Copy env file and fill secrets
```bash
cp .env.example .env
```

2) Install dependencies (monorepo workspaces)
```bash
npm install --workspaces
```

3) Database (PostgreSQL)
- Create a database, set `DATABASE_URL` in `.env`
- Run Prisma migrations
```bash
cd server
npx prisma migrate dev --name init
```

4) Run in development (two processes)
```bash
# terminal 1
npm run dev --workspace server
# terminal 2
npm run dev --workspace frontend
```
Frontend runs on http://localhost:3000, backend WebSocket/API on http://localhost:4000.

## Deployment Guide (example)
- **Frontend:** Deploy `frontend` to Vercel (set `NEXT_PUBLIC_API_URL` to your backend URL).
- **Backend:** Deploy `server` to Render/Fly/Heroku. Ensure WebSockets enabled, set `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`.
- Run `npm run build` in `server` during deploy; start with `node dist/index.js`.

## Key Features
- Real-time matchmaking via Socket.IO rooms and in-memory queues per time control.
- Server-side move validation with chess.js; clocks with increment; checkmate/draw detection.
- AI games: server spins Stockfish WASM, plays best moves at chosen depth.
- Analysis board: local sandbox with engine evaluation endpoint.
- Profiles & history: JWT-protected endpoints and Glicko-style (Elo) rating update.
- Light/dark themes, responsive UI, drag-and-drop chessboard.

## API Snapshot (server)
- `POST /api/auth/register` `{username, password}` → `{token, rating}`
- `POST /api/auth/login` `{username, password}`
- `POST /api/match/ai` `{level, timeControl}` → returns game object (then join via socket `joinGame`)
- `GET /api/profile/me` (auth)
- `GET /api/history?limit=20` (auth)
- `POST /api/analysis/evaluate` `{fen, depth}` → `{move, bestLine, score}`

WebSocket events:
- Client → `queue` `{timeControl, rated}` to enter matchmaking
- Client → `joinGame` `{gameId}` to rejoin/observe
- Client → `move` `{gameId, from, to, promotion}` to play
- Server → `game` (full game state), `move` (last move + clocks), `status` (info)

## Testing
- Server uses Vitest for lightweight checks. Run `npm test --workspace server`.

## Notes & Next Steps
- Persist queues and active games in Redis for horizontal scale.
- Add anti-abuse/cheat heuristics and reconnect timeouts.
- Extend rating pools per time control and add friend/challenge endpoints.
