# Manter

**The first dating app that turns "is he actually a good man?" from a gut feeling into a verified, data-backed score.**

Women browse men ranked by 23 character qualities, rated by women who've actually dated them, with AI-powered red flag detection in every chat — before they ever go on a date.

---

## What makes Manter different

| Feature | Tinder | Bumble | Hinge | Manter |
|---|---|---|---|---|
| Match on 23 character qualities | No | No | Partial | **Yes** |
| Behavioral quiz for men | No | No | No | **Yes** |
| AI red flag scan in chat | No | No | No | **Yes** |
| Community ratings from real women | No | No | No | **Yes** |
| Date safety check-in | No | No | No | **Yes** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 52 + Expo Router v3 |
| State | Zustand + SecureStore |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Redis |
| Real-time | Socket.io |
| AI | Claude Haiku API (red flag detection) |
| Storage | Cloudflare R2 |
| Auth | JWT (15m access + 30d refresh) + bcrypt |
| Monorepo | pnpm workspaces |

**Estimated cost at launch: $0–10/month**

---

## Project Structure

```
manter/
├── mobile/          # React Native + Expo app (iOS + Android)
├── server/          # Node.js + Express API + Socket.io
├── shared/          # Shared TypeScript types and Zod schemas
├── docker-compose.yml
└── IMPLEMENTATION_PLAN.md
```

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker Desktop

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start database and Redis

```bash
docker compose up -d
```

### 3. Set up environment

```bash
cp server/.env.example server/.env
# Edit server/.env — add your ANTHROPIC_API_KEY and R2 credentials
```

### 4. Run migrations and generate Prisma client

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start the backend

```bash
pnpm server
# Runs on http://localhost:3000
```

### 6. Start the mobile app

```bash
pnpm mobile
# Scan the QR code with Expo Go
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/users/me` | Get current user |
| PUT | `/users/me` | Update profile |
| GET | `/users/:id` | Get public profile |
| POST | `/upload/photo` | Upload profile photo |
| GET | `/discover` | Scored candidate feed (Phase 3) |
| POST | `/matches/:id/like` | Like a candidate (Phase 3) |
| GET | `/chat/history/:matchId` | Message history (Phase 4) |
| POST | `/ratings` | Rate a man on 23 qualities (Phase 6) |
| POST | `/safety/checkin` | Set a date check-in timer (Phase 7) |

Real-time events are handled over Socket.io (see `server/src/socket/`).

---

## Build Phases

| Phase | Focus | Status |
|---|---|---|
| 1 | Foundation — auth, profiles, DB, Expo scaffold | ✅ In progress |
| 2 | Onboarding — behavioral quiz, quality weights | Upcoming |
| 3 | Discover & matching — compatibility scoring | Upcoming |
| 4 | Real-time chat | Upcoming |
| 5 | AI red flag detection | Upcoming |
| 6 | Community ratings | Upcoming |
| 7 | Safety features | Upcoming |
| 8 | Polish & App Store launch | Upcoming |

Full plan: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

---

## Environment Variables

See [`server/.env.example`](./server/.env.example) for all required variables.

Key variables:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...   # Claude Haiku — red flag scanning
R2_ACCOUNT_ID=...               # Cloudflare R2 — photo storage
```
