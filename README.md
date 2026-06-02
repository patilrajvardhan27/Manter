# Manter

**The first dating app that turns "is he actually a good man?" from a gut feeling into a verified, data-backed score.**

Women browse men ranked by 23 character qualities — scored by an open-ended behavioral assessment evaluated by Claude AI (no multiple choice, so answers can't be faked), refined by real community ratings from women who've actually dated them, with AI-powered red flag detection in every conversation.

---

## What makes Manter different

| Feature | Tinder | Bumble | Hinge | Manter |
|---|---|---|---|---|
| Match on 23 character qualities | No | No | Partial | **Yes** |
| AI-evaluated open-ended assessment for men | No | No | No | **Yes** |
| Community ratings from real women | No | No | No | **Yes** |
| AI red flag scan in every chat | No | No | No | **Yes** |
| Full conversation safety analysis | No | No | No | **Yes** |
| Date safety check-in + emergency alerts | No | No | No | **Yes** |
| Biometric app lock | No | No | No | **Yes** |
| Screenshot prevention in chat | No | No | No | **Yes** |

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile | React Native + Expo SDK 52 + Expo Router v3 | iOS + Android, single codebase |
| State | Zustand + SecureStore | Persisted auth, chat store |
| Backend | Node.js + Express + TypeScript | REST + WebSocket |
| ORM | Prisma | Type-safe queries + migrations |
| Database | PostgreSQL | Primary data store |
| Cache | Redis (ioredis) | Sessions, push tokens, pass tracking |
| Real-time | Socket.io | Chat, typing, presence, red flag alerts |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) | Quiz evaluation + per-message red flag scan + full conversation analysis |
| File Storage | Cloudflare R2 | Photos, S3-compatible, generous free tier |
| Auth | JWT (15m access + 30d refresh) + bcrypt | No third-party auth service |
| Push Notifications | Expo Push API + FCM | Match alerts, messages, safety alerts |
| Email | Nodemailer | Transactional + emergency safety alerts |
| Monorepo | pnpm workspaces | `mobile/`, `server/`, `shared/` |

**Estimated infrastructure cost at launch: $0–10/month**

---

## Project Structure

```
manter/
├── mobile/                      # React Native + Expo app
│   ├── app/                     # Expo Router screens (file-based routing)
│   │   ├── (auth)/              # Welcome, login, register, onboarding
│   │   ├── (tabs)/              # Discover, matches, chat, community, profile
│   │   ├── profile/[userId].tsx # Public profile with scores + red flag stats
│   │   ├── rate/[userId].tsx    # 23-quality rating wizard
│   │   ├── analysis/[matchId].tsx # Full AI conversation analysis
│   │   └── safety/              # Safety hub, check-in timer, emergency contacts
│   ├── components/
│   │   ├── cards/               # CandidateCard, ScoreBreakdown
│   │   ├── chat/                # MessageBubble, ChatInput, RedFlagBanner, AnalysisReport
│   │   └── ui/                  # Button, FormInput
│   ├── hooks/                   # useSocket, useBiometricLock, usePushNotifications
│   ├── store/                   # auth.store, chat.store (Zustand)
│   ├── constants/               # 23 qualities, quiz questions, red flag labels
│   └── lib/                     # api (Axios), socket (Socket.io), storage
│
├── server/                      # Node.js + Express API
│   ├── src/
│   │   ├── routes/              # 10 route modules
│   │   ├── controllers/         # auth, users, quiz, discover, matches, chat,
│   │   │                        #   ratings, safety, ai, upload
│   │   ├── services/            # scoring, quiz, ai, safety, notifications, email
│   │   ├── socket/              # chat handler, presence handler
│   │   ├── middleware/          # auth, role, validate, rateLimit, errorHandler
│   │   └── lib/                 # prisma, redis, claude, r2, env
│   └── prisma/
│       └── schema.prisma        # 10 models: User, ManProfile, WomanProfile,
│                                #   OnboardingResponse, Match, Message, Rating,
│                                #   SafetyCheckin, EmergencyContact, Report, Block
│
├── shared/                      # Shared across mobile + server
│   ├── types/index.ts           # All TypeScript interfaces
│   └── schemas/                 # Zod validation schemas
│
├── scripts/
│   └── generate-assets.mjs     # Generates all app store PNG assets via Sharp
│
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 for local dev
├── railway.json                 # Railway deployment config
├── render.yaml                  # Render.com IaC (web + DB + Redis)
└── IMPLEMENTATION_PLAN.md       # Full build plan, schema, algorithm docs
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
# Fill in: ANTHROPIC_API_KEY, R2 credentials, SMTP config
```

### 4. Generate Prisma client and run migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start the backend

```bash
pnpm server
# API running at http://localhost:3000
```

### 6. Start the mobile app

```bash
pnpm mobile
# Scan the QR code with Expo Go (iOS or Android)
```

### 7. Generate app store assets (optional)

```bash
pnpm assets
# Creates icon.png, splash.png, adaptive-icon.png, notification-icon.png in mobile/assets/images/
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns JWT pair |
| POST | `/auth/refresh` | Refresh access token |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/me` | Current user + profiles |
| PUT | `/users/me` | Update name, bio, city |
| POST | `/users/me/weights` | Save quality priority weights (women) |
| POST | `/users/me/push-token` | Register Expo push token |
| GET | `/users/:id` | Public profile |

### Discover & Matching
| Method | Endpoint | Description |
|---|---|---|
| GET | `/discover` | Scored candidate feed, paginated |
| POST | `/matches/like/:userId` | Like — creates match on mutual |
| POST | `/matches/pass/:userId` | Pass (Redis, 30-day TTL) |
| GET | `/matches` | All matched conversations |

### Quiz & Ratings
| Method | Endpoint | Description |
|---|---|---|
| POST | `/quiz/submit` | Submit free-text quiz answers → Claude AI evaluates → quality scores stored (men) |
| GET | `/quiz/status` | Quiz completion status |
| POST | `/ratings/:userId` | Rate a man on 23 qualities (women) |
| GET | `/ratings/:userId` | Get ratings for a profile |
| GET | `/ratings/feed` | Community feed (top-rated + recent) |

### Chat (REST + Socket.io)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/chat/history/:matchId` | Paginated message history |

**Socket.io events:**
| Event | Direction | Description |
|---|---|---|
| `chat:join` | client → server | Join a match room |
| `chat:leave` | client → server | Leave a match room |
| `message:send` | client → server | Send a message |
| `message:new` | server → client | New message delivered |
| `message:read` | bidirectional | Mark messages read |
| `typing:start/stop` | client → server | Typing indicators |
| `red_flag:alert` | server → client | AI detected a flag (score ≥ 0.7) |
| `presence:online/offline` | server → client | User presence |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/analyze/:matchId` | Full conversation safety analysis (women only) |
| GET | `/ai/stats/:userId` | Aggregate red flag stats for a man's profile |

### Safety
| Method | Endpoint | Description |
|---|---|---|
| POST | `/safety/checkin` | Create date check-in timer |
| POST | `/safety/checkin/:id/confirm` | Confirm you're safe |
| DELETE | `/safety/checkin/:id` | Cancel check-in |
| GET | `/safety/checkin/active` | Get active check-in |
| GET | `/safety/contacts` | List emergency contacts |
| POST | `/safety/contacts` | Add contact (max 3) |
| PUT | `/safety/contacts/:id` | Update contact |
| DELETE | `/safety/contacts/:id` | Remove contact |
| POST | `/safety/report` | Report a user |
| POST | `/safety/block/:userId` | Block a user |
| DELETE | `/safety/block/:userId` | Unblock a user |

### Upload
| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload/photo` | Upload profile photo → Sharp resize → R2 |

---

## Mobile Screens

| Screen | Path | Description |
|---|---|---|
| Welcome | `/(auth)/welcome` | Dark gradient landing, value props |
| Register | `/(auth)/register` | Email + password |
| Login | `/(auth)/login` | Email + password |
| Role | `/(auth)/onboarding/role` | Woman / Man card picker |
| Profile setup | `/(auth)/onboarding/profile` | Name, age, city, bio, photo |
| Quiz | `/(auth)/onboarding/quiz` | 6 open-ended behavioral scenarios, free-text answers evaluated by Claude AI (men) |
| Weights | `/(auth)/onboarding/weights` | 23-quality priority setter (women) |
| Discover | `/(tabs)/discover` | Swipeable card stack with like/pass |
| Matches | `/(tabs)/matches` | Matched users with last message |
| Chat list | `/(tabs)/chat` | New matches + active conversations |
| Chat room | `/(tabs)/chat/[matchId]` | Real-time chat, red flag banner, AI shield |
| Community | `/(tabs)/community` | Top-rated men, recent rating activity |
| My profile | `/(tabs)/profile` | Score breakdown, quiz nudge, safety hub link |
| Edit profile | `/(tabs)/profile/edit` | Name, bio, city, photos |
| Public profile | `/profile/[userId]` | Photo gallery, scores, red flag stats, rate button |
| Rate | `/rate/[userId]` | 5-step rating wizard across 23 qualities |
| AI Analysis | `/analysis/[matchId]` | Full conversation health report |
| Safety hub | `/safety` | Check-in status, contacts, biometric toggle |
| Check-in | `/safety/checkin` | Timer setup or active countdown + "I'm Safe" |
| Contacts | `/safety/contacts` | Emergency contacts CRUD |

---

## Key Algorithms

### Compatibility Score
Computed server-side per candidate in the discover feed:

```
score = Σ(weight_i × quality_score_i) / Σ(weight_i)  ×  100

weight_i       = woman's priority for quality i  (1–5)
quality_score_i = community aggregate if ratingCount ≥ 3, else AI quiz score  (1–10)
```

Women with different priorities see different rankings for the same man.

### Community Score Update
Every new rating triggers a full recomputation:
```
communityScore_i = mean(all ratings for quality i)
overallCommunityScore = mean(communityScore_1..23)
ManProfile.qualityScores overwritten with community aggregate
```

### AI Quiz Evaluation
Men answer 6 open-ended scenario questions (60-character minimum per answer). Claude Haiku reads all answers together and scores each of the 23 qualities (1–10), explicitly penalising generic virtue-signalling, inconsistency across answers, and deflection. No answer options means the system cannot be gamed by picking the "right" choice.

### Red Flag Detection
- **Per-message scan:** Claude Haiku scans last 10 messages after every message sent by a man. Score 0–1 across 7 flag categories. Emits `red_flag:alert` socket event + push notification at score ≥ 0.7.
- **Full analysis:** Claude Haiku reads entire conversation history, returns structured report with patterns (severity + excerpt + count), green flags, and recommendation.

---

## Safety Architecture

The date check-in works entirely server-side — no app open required:

1. User sets a timer via `POST /safety/checkin`
2. Server stores `scheduledAt` in PostgreSQL
3. `startCheckinProcessor()` polls every 60 seconds at boot
4. If `scheduledAt` has passed with no `confirmedAt` → dispatch email alerts to all emergency contacts
5. User taps "I'm Safe" → `POST /safety/checkin/:id/confirm` → `confirmedAt` set → processor skips it

---

## Deployment

### Railway (recommended)

```bash
# Connect your GitHub repo to Railway
# Add environment variables (see server/.env.example)
# Railway auto-detects railway.json and deploys
```

### Render

```bash
# render.yaml provisions: web service + PostgreSQL + Redis in one file
# Push to GitHub → connect repo in Render dashboard
```

### Mobile (Expo EAS)

```bash
# Development build
cd mobile && eas build --profile development --platform all

# Production build (App Store + Play Store)
cd mobile && eas build --profile production --platform all

# Submit to stores
cd mobile && eas submit --profile production --platform all
```

---

## Environment Variables

See [`server/.env.example`](./server/.env.example) for the full list.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `ANTHROPIC_API_KEY` | Yes* | Claude Haiku — red flag detection + analysis |
| `R2_ACCOUNT_ID` | Yes* | Cloudflare R2 — photo storage |
| `R2_ACCESS_KEY_ID` | Yes* | R2 credentials |
| `R2_SECRET_ACCESS_KEY` | Yes* | R2 credentials |
| `R2_BUCKET_NAME` | Yes* | R2 bucket name |
| `R2_PUBLIC_URL` | Yes* | Public CDN URL for photos |
| `SMTP_HOST` | No | Email alerts (safety + welcome) |
| `SMTP_USER` | No | SMTP credentials |
| `SMTP_PASS` | No | SMTP credentials |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: `*`) |
| `PORT` | No | Server port (default: `3000`) |

*Required for full functionality. App starts without them but those features will be disabled.

---

## Cost Breakdown

| Service | Free Tier | Pay-as-you-go |
|---|---|---|
| PostgreSQL + Redis (Railway/Render) | Free tier | ~$7/month |
| Cloudflare R2 | 10 GB + 1M reads/month free | $0.015/GB |
| Anthropic Claude Haiku | Pay-per-use | ~$0.001 per scan |
| Expo EAS Build | 30 builds/month free | Free |
| Expo Push Notifications | Unlimited free | Free |
| **Total at launch** | **$0** | **< $10/month** |
