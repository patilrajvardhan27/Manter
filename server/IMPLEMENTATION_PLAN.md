# Manter — Server Implementation Plan
## Node.js + Express + PostgreSQL + Redis + Socket.io

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 20 LTS + TypeScript | Async I/O perfect for real-time chat; TS prevents runtime errors in schema-heavy code |
| HTTP Framework | Express.js | Mature, minimal, extensive middleware ecosystem |
| Real-time | Socket.io | Room-based chat, built-in reconnection, Redis adapter for multi-process |
| Database | PostgreSQL 16 | Relational model fits the quality scoring joins; JSONB for photos/evidence |
| Query Builder | Knex.js | Full SQL control for weighted aggregation queries; Prisma can't do these without raw escapes |
| Cache / Sessions | Redis 7 | Socket.io adapter, JWT blacklist, rate limit state, score caching |
| AI | @anthropic-ai/sdk (Claude) | Red flag detection, conversation analysis |
| Storage | AWS S3 | Profile photos, screenshot evidence — served via CDN |
| Push Notifications | expo-server-sdk | Sends to Expo push notification service |

---

## Folder Structure

```
server/
├── package.json
├── tsconfig.json
├── .env                              # DATABASE_URL, REDIS_URL, JWT_SECRET, AWS_*, ANTHROPIC_API_KEY
├── .env.example                      # Template with all required env vars (no values)
├── Dockerfile
├── docker-compose.yml                # postgres + redis + server
│
├── src/
│   ├── app.ts                        # Express app: middleware, routes, error handler
│   ├── server.ts                     # HTTP + Socket.io server bootstrap on port 3000
│   │
│   ├── config/
│   │   ├── database.ts               # Knex PostgreSQL connection pool
│   │   ├── redis.ts                  # ioredis client singleton
│   │   ├── s3.ts                     # AWS S3 client config
│   │   ├── socket.ts                 # Socket.io server + Redis adapter setup
│   │   └── env.ts                    # Zod-validated env vars (fails fast if missing)
│   │
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_users.sql
│   │   │   ├── 002_create_quality_definitions.sql
│   │   │   ├── 003_create_man_profiles.sql
│   │   │   ├── 004_create_woman_profiles.sql
│   │   │   ├── 005_create_man_quality_scores.sql
│   │   │   ├── 006_create_woman_quality_priorities.sql
│   │   │   ├── 007_create_matches.sql
│   │   │   ├── 008_create_swipes.sql
│   │   │   ├── 009_create_conversations.sql
│   │   │   ├── 010_create_messages.sql
│   │   │   ├── 011_create_community_ratings.sql
│   │   │   ├── 012_create_behavior_reports.sql
│   │   │   ├── 013_create_red_flag_logs.sql
│   │   │   └── 014_create_verifications.sql
│   │   │
│   │   └── seeds/
│   │       ├── quality_definitions.sql    # Seed all 23 qualities with codes, labels, categories
│   │       └── test_users.sql             # Dev-only seed for testing
│   │
│   ├── models/                        # Knex query wrappers per table
│   │   ├── User.model.ts
│   │   ├── ManProfile.model.ts
│   │   ├── WomanProfile.model.ts
│   │   ├── QualityScore.model.ts
│   │   ├── Match.model.ts
│   │   ├── Swipe.model.ts
│   │   ├── Conversation.model.ts
│   │   ├── Message.model.ts
│   │   ├── CommunityRating.model.ts
│   │   ├── BehaviorReport.model.ts
│   │   ├── RedFlagLog.model.ts
│   │   └── Verification.model.ts
│   │
│   ├── routes/
│   │   ├── index.ts                   # Mount all routers under /api/v1
│   │   ├── auth.routes.ts
│   │   ├── profiles.routes.ts
│   │   ├── matching.routes.ts
│   │   ├── conversations.routes.ts
│   │   ├── community.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── verification.routes.ts
│   │   └── safety.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── profiles.controller.ts
│   │   ├── matching.controller.ts
│   │   ├── conversations.controller.ts
│   │   ├── community.controller.ts
│   │   ├── ai.controller.ts
│   │   ├── verification.controller.ts
│   │   └── safety.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts            # JWT issue/verify, bcrypt, refresh token rotation
│   │   ├── matching.service.ts        # Compatibility ranking, candidate pagination
│   │   ├── quality.service.ts         # Aggregate scores, compute green_flag_score
│   │   ├── ai.service.ts             # Claude API red flag detection
│   │   ├── notification.service.ts    # Expo push notifications
│   │   ├── media.service.ts           # S3 upload, Sharp image resizing
│   │   ├── community.service.ts       # Rating aggregation, reputation scoring
│   │   ├── verification.service.ts    # Persona ID verification webhook handling
│   │   └── socket.service.ts          # Real-time event emitters (match, redflag, safety)
│   │
│   ├── middleware/
│   │   ├── authenticate.ts            # Verify JWT, attach user to req
│   │   ├── requireRole.ts             # requireRole('woman') | requireRole('man')
│   │   ├── rateLimiter.ts             # express-rate-limit configs per endpoint type
│   │   ├── upload.ts                  # multer + S3 streaming upload
│   │   ├── errorHandler.ts            # Global Express error handler
│   │   └── requestLogger.ts           # Morgan + Winston structured logging
│   │
│   ├── sockets/
│   │   ├── chat.socket.ts             # join room, send/receive messages, typing, read
│   │   ├── match.socket.ts            # real-time match notification
│   │   └── safety.socket.ts           # safety check-in timer events
│   │
│   └── utils/
│       ├── compatibilityEngine.ts     # Core weighted matching algorithm
│       ├── redFlagPrompts.ts          # Claude prompt templates
│       ├── jwtHelper.ts               # sign, verify, refresh token helpers
│       ├── pagination.ts              # Cursor-based pagination helper
│       └── logger.ts                  # Winston logger config
```

---

## Database Schema

### `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('woman', 'man')),
  is_verified     BOOLEAN DEFAULT false,
  is_id_verified  BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  last_active_at  TIMESTAMPTZ
);
```

### `quality_definitions` (seeded, static reference table)
```sql
CREATE TABLE quality_definitions (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT NOT NULL,    -- From points.txt verbatim
  category    TEXT NOT NULL,    -- 'respect', 'emotional', 'support', 'connection', 'character', 'practical', 'future'
  weight      NUMERIC DEFAULT 1.0,
  sort_order  INT NOT NULL
);
-- 23 rows seeded at startup
```

### `man_profiles`
```sql
CREATE TABLE man_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name          TEXT NOT NULL,
  age                   INT NOT NULL,
  bio                   TEXT,
  city                  TEXT,
  photos                JSONB DEFAULT '[]',  -- Array of S3 CDN URLs
  green_flag_score      NUMERIC(5,2) DEFAULT 0,   -- Computed, cached hourly
  community_score       NUMERIC(5,2) DEFAULT 0,   -- Aggregated from community_ratings
  is_background_checked BOOLEAN DEFAULT false,
  verification_status   TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  quiz_score            INT DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

### `woman_profiles`
```sql
CREATE TABLE woman_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name      TEXT NOT NULL,
  age               INT NOT NULL,
  bio               TEXT,
  city              TEXT,
  photos            JSONB DEFAULT '[]',
  max_distance_km   INT DEFAULT 50,
  age_min           INT DEFAULT 22,
  age_max           INT DEFAULT 40,
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

### `man_quality_scores`
```sql
CREATE TABLE man_quality_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  man_profile_id  UUID REFERENCES man_profiles(id) ON DELETE CASCADE,
  quality_id      INT REFERENCES quality_definitions(id),
  self_score      NUMERIC(3,1) CHECK (self_score BETWEEN 1 AND 5),
  quiz_score      NUMERIC(3,1) CHECK (quiz_score BETWEEN 1 AND 5),
  community_score NUMERIC(3,1) CHECK (community_score BETWEEN 1 AND 5),
  final_score     NUMERIC(3,1),  -- Computed: (self×0.2) + (quiz×0.4) + (community×0.4)
  UNIQUE(man_profile_id, quality_id)
);
```

Score blending formula: `final_score = (self_score × 0.2) + (quiz_score × 0.4) + (community_score × 0.4)`
Self-score is lowest weight — men rate themselves generously; community and quiz are ground truth.

### `woman_quality_priorities`
```sql
CREATE TABLE woman_quality_priorities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woman_profile_id  UUID REFERENCES woman_profiles(id) ON DELETE CASCADE,
  quality_id        INT REFERENCES quality_definitions(id),
  priority          INT CHECK (priority BETWEEN 1 AND 5),
  is_dealbreaker    BOOLEAN DEFAULT false,
  UNIQUE(woman_profile_id, quality_id)
);
```

### `matches`
```sql
CREATE TABLE matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woman_id            UUID REFERENCES users(id),
  man_id              UUID REFERENCES users(id),
  compatibility_score NUMERIC(5,2),
  matched_at          TIMESTAMPTZ DEFAULT now(),
  status              TEXT DEFAULT 'active' CHECK (status IN ('active','unmatched')),
  UNIQUE(woman_id, man_id)
);
```

### `swipes`
```sql
CREATE TABLE swipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id   UUID REFERENCES users(id),
  target_id   UUID REFERENCES users(id),
  direction   TEXT NOT NULL CHECK (direction IN ('like','pass','superlike')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(swiper_id, target_id)
);
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id, target_id);
```

### `conversations`
```sql
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID REFERENCES matches(id),
  woman_id        UUID REFERENCES users(id),
  man_id          UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true
);
```

### `messages`
```sql
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES conversations(id),
  sender_id         UUID REFERENCES users(id),
  content           TEXT NOT NULL,
  message_type      TEXT DEFAULT 'text' CHECK (message_type IN ('text','image','system')),
  red_flag_score    NUMERIC(3,2),    -- AI score 0.0–1.0, null if not scanned
  is_flagged        BOOLEAN DEFAULT false,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

### `community_ratings`
```sql
CREATE TABLE community_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woman_id        UUID REFERENCES users(id),
  man_id          UUID REFERENCES users(id),
  quality_id      INT REFERENCES quality_definitions(id),
  score           INT CHECK (score BETWEEN 1 AND 5),
  context_note    TEXT,         -- Optional brief explanation
  date_of_date    DATE,         -- When they met (for freshness weighting)
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(woman_id, man_id, quality_id)
);
```

### `behavior_reports`
```sql
CREATE TABLE behavior_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID REFERENCES users(id),
  reported_id   UUID REFERENCES users(id),
  category      TEXT,           -- 'harassment', 'fake_profile', 'controlling', etc.
  description   TEXT,
  evidence_urls JSONB DEFAULT '[]',  -- S3 screenshot URLs
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','actioned')),
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### `red_flag_logs`
```sql
CREATE TABLE red_flag_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES conversations(id),
  triggered_by      UUID REFERENCES users(id),
  ai_analysis       JSONB,      -- Full Claude API response JSON
  flagged_behaviors JSONB,      -- Array of detected pattern strings
  severity          TEXT CHECK (severity IN ('low','medium','high','critical')),
  is_dismissed      BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### `verifications`
```sql
CREATE TABLE verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  provider    TEXT,             -- 'persona', 'stripe_identity'
  external_id TEXT,             -- Provider's session/inquiry ID
  status      TEXT DEFAULT 'initiated' CHECK (status IN ('initiated','pending','approved','declined')),
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## API Endpoints

### Auth — `/api/v1/auth`
```
POST   /register          # { role, email, password } → { user, tokens }
POST   /login             # { email, password } → { user, tokens }
POST   /refresh           # { refreshToken } → { accessToken, refreshToken }
POST   /logout            # blacklists refresh token in Redis
POST   /forgot-password   # sends reset email
POST   /reset-password    # { token, newPassword }
```

### Profiles — `/api/v1/profiles`
```
GET    /me                # own full profile
PUT    /me                # update own profile
POST   /me/photos         # multipart upload → S3 → returns CDN URL
DELETE /me/photos/:photoId

# Man-specific
PUT    /man/qualities     # { ratings: [{qualityId, selfScore}] }
POST   /man/quiz          # { answers: [{questionId, answerId}] } → computes quiz_score
GET    /man/:id           # public man profile (for women to view)
GET    /man/:id/quality-breakdown  # spider chart data: per-quality scores

# Woman-specific
PUT    /woman/priorities  # { priorities: [{qualityId, priority, isDealbreaker}] }
GET    /woman/preferences
PUT    /woman/preferences  # { ageMin, ageMax, maxDistanceKm }
```

### Matching — `/api/v1/matching`
```
GET    /candidates        # Ranked paginated candidates for the logged-in woman
POST   /swipe             # { targetId, direction: 'like'|'pass'|'superlike' }
                          # Auto-creates match if mutual; fires match:new socket event
GET    /matches           # All active matches with compatibility scores
DELETE /matches/:matchId  # Unmatch — sets status='unmatched', closes conversation
GET    /compatibility/:manId  # Compatibility % breakdown between logged-in woman and man
```

### Conversations & Chat — `/api/v1/conversations`
```
GET    /                      # All conversations (ordered by last_message_at)
GET    /:id                   # Single conversation metadata
GET    /:id/messages          # Paginated message history (cursor-based)
POST   /:id/messages          # REST fallback for offline message queuing
DELETE /:id                   # Archive/delete conversation
```

### Community — `/api/v1/community`
```
POST   /rate                      # { manId, ratings: [{qualityId, score, contextNote}], dateOfDate }
                                  # Women only (requireRole('woman') enforced)
GET    /man/:manId/score          # { overallScore, categoryBreakdown, totalRatings }
GET    /man/:manId/reviews        # Paginated anonymous reviews
POST   /report                    # { reportedId, category, description, evidenceUrls }
GET    /reports/mine              # Own submitted reports
```

### AI Red Flag — `/api/v1/ai`
```
POST   /analyze-screenshot        # multipart text (OCR'd client-side) → Claude analysis
POST   /analyze-conversation/:id  # Scan last 20 messages in this conversation
GET    /red-flags/:conversationId # History of flags for this conversation
POST   /dismiss-flag/:flagId      # Woman dismisses a false positive
```

### Verification — `/api/v1/verification`
```
POST   /initiate          # Start Persona ID verification session → returns redirect URL
GET    /status            # Own verification status
POST   /webhook           # Persona/Stripe Identity webhook (public, no auth)
```

### Safety — `/api/v1/safety`
```
POST   /checkin/start              # { durationMinutes } → { checkInId, expiresAt }
POST   /checkin/:id/confirm        # I'm safe — cancels timer
POST   /checkin/:id/alert          # Manual trigger emergency alert
GET    /emergency-contacts         # Get saved contacts
PUT    /emergency-contacts         # { contacts: [{name, phone}] } — max 2
```

---

## Socket.io Event Map

### Client → Server
```
chat:join      { conversationId }                    # Join a chat room
chat:message   { conversationId, content, type }     # Send a message
chat:typing    { conversationId, isTyping: boolean } # Typing indicator
chat:read      { conversationId, messageId }         # Mark message as read
safety:checkin { checkInId, status: 'confirm'|'alert' }
```

### Server → Client
```
chat:message   { message }                           # New incoming message
chat:typing    { userId, isTyping }                  # Partner typing state
chat:read      { messageId, readAt }                 # Read receipt
match:new      { matchId, compatibility, manProfile } # Real-time match notification
redflag:alert  { conversationId, flagId, severity, behaviors[] } # AI flag detected
safety:alert   { checkInId, contactsNotified: number } # Emergency contacts alerted
```

---

## Core Compatibility Algorithm — `src/utils/compatibilityEngine.ts`

```typescript
import db from '../config/database';

export async function rankCandidatesForWoman(womanId: string, limit = 20, cursor?: string) {
  // 1. Fetch woman's quality priorities
  const priorities = await db('woman_quality_priorities')
    .where({ woman_profile_id: womanId })
    .select('quality_id', 'priority', 'is_dealbreaker');

  // 2. Get all unswiped man IDs
  const swipedIds = await db('swipes')
    .where({ swiper_id: womanId })
    .pluck('target_id');

  // 3. For each candidate man, compute compatibility via weighted SQL
  const candidates = await db.raw(`
    SELECT
      mp.id AS man_profile_id,
      mp.user_id,
      mp.display_name,
      mp.green_flag_score,
      mp.community_score,
      mp.is_id_verified,
      mp.verification_status,
      SUM(mqs.final_score * wqp.priority) AS weighted_total,
      SUM(5.0 * wqp.priority)             AS max_possible
    FROM man_profiles mp
    JOIN man_quality_scores mqs ON mqs.man_profile_id = mp.id
    JOIN woman_quality_priorities wqp ON wqp.quality_id = mqs.quality_id
      AND wqp.woman_profile_id = :womanId
    WHERE mp.user_id NOT IN (:...swipedIds)
      AND mp.verification_status = 'verified'
      ${cursor ? 'AND mp.id > :cursor' : ''}
    GROUP BY mp.id
    ORDER BY (SUM(mqs.final_score * wqp.priority) / SUM(5.0 * wqp.priority)) DESC
    LIMIT :limit
  `, { womanId, swipedIds: swipedIds.length ? swipedIds : ['00000000-0000-0000-0000-000000000000'], cursor, limit });

  // 4. Apply dealbreaker penalty and modifiers client-friendly
  return candidates.rows.map(c => {
    const rawPct = (c.weighted_total / c.max_possible) * 100;
    let score = Math.min(rawPct, 100);
    if (c.community_score > 4.5) score = Math.min(score + 5, 100);
    if (c.is_id_verified) score = Math.min(score + 3, 100);
    return { ...c, compatibilityScore: Math.round(score) };
  });
}
```

---

## AI Red Flag Detection — `src/services/ai.service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { redFlagSystemPrompt } from '../utils/redFlagPrompts';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function detectRedFlags(conversationText: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: redFlagSystemPrompt,
    messages: [{ role: 'user', content: conversationText }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(raw) as {
    severity: 'low' | 'medium' | 'high' | 'critical';
    behaviors: string[];
    explanation: string;
    recommendation: string;
  };
}
```

`redFlagPrompts.ts` instructs Claude to check for: controlling language, anger escalation, guilt-tripping, boundary violations, rushing intimacy, possessiveness, gaslighting, misogynistic language, dismissiveness of feelings, disrespect of "no". Returns JSON only.

Automatic scan trigger: after every 10 messages in a conversation, a background job runs `detectRedFlags` and emits `redflag:alert` via Socket.io if severity ≥ medium.

---

## Libraries

```json
{
  "dependencies": {
    "express": "^4.19.x",
    "socket.io": "^4.7.x",
    "knex": "^3.1.x",
    "pg": "^8.12.x",
    "ioredis": "^5.4.x",
    "@socket.io/redis-adapter": "^8.3.x",
    "bcryptjs": "^2.4.x",
    "jsonwebtoken": "^9.0.x",
    "zod": "^3.23.x",
    "multer": "^1.4.x",
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x",
    "sharp": "^0.33.x",
    "@anthropic-ai/sdk": "^0.24.x",
    "expo-server-sdk": "^3.10.x",
    "express-rate-limit": "^7.3.x",
    "helmet": "^7.1.x",
    "cors": "^2.8.x",
    "morgan": "^1.10.x",
    "winston": "^3.13.x",
    "node-cron": "^3.0.x",
    "uuid": "^10.x",
    "dayjs": "^1.11.x"
  },
  "devDependencies": {
    "typescript": "^5.4.x",
    "ts-node": "^10.9.x",
    "nodemon": "^3.1.x",
    "@types/express": "^4.17.x",
    "@types/pg": "^8.11.x",
    "@types/bcryptjs": "^2.4.x",
    "@types/jsonwebtoken": "^9.0.x",
    "@types/multer": "^1.4.x",
    "@types/cors": "^2.8.x",
    "@types/morgan": "^1.9.x",
    "@types/node-cron": "^3.0.x"
  }
}
```

---

## docker-compose.yml

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: manter
      POSTGRES_USER: manter
      POSTGRES_PASSWORD: manter_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  server:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://manter:manter_dev@postgres:5432/manter
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## Development Phases

### Phase 1 — Foundation (Week 1–2)
1. `npm init`, install all dependencies, configure TypeScript (`tsconfig.json`)
2. Write `docker-compose.yml`, start postgres + redis
3. Configure Knex: `knexfile.ts` with migration and seed directories
4. Write and run migrations 001–014
5. Seed `quality_definitions` with all 23 qualities (`seeds/quality_definitions.sql`)
6. Build `auth.service.ts`: register (bcrypt), login, JWT access + refresh token pair
7. Build `authenticate.ts` + `requireRole.ts` middleware
8. Write `auth.routes.ts` → `auth.controller.ts` → `auth.service.ts`
9. Test: POST /register, POST /login, POST /refresh via curl/Postman

### Phase 2 — Profiles & Qualities (Week 3–4)
10. Build `profiles.routes.ts` with full CRUD
11. `PUT /man/qualities` — store self-ratings in `man_quality_scores`
12. `POST /man/quiz` — map quiz answers to quality scores, store as `quiz_score`
13. `quality.service.ts` — compute `final_score` blend per quality after each update
14. Photo upload middleware: multer → Sharp resize to 800px max → S3 → return CDN URL
15. `GET /man/:id/quality-breakdown` — return all 23 quality final_scores for spider chart

### Phase 3 — Matching Engine (Week 5–6)
16. Implement `compatibilityEngine.ts` with weighted SQL query
17. `GET /matching/candidates` — paginated, ranked, excludes already-swiped men
18. `POST /matching/swipe` — record swipe, check for mutual like → create match
19. On match creation: create `conversations` row, emit `match:new` via Socket.io
20. Set up Socket.io server + Redis adapter in `config/socket.ts`
21. Build `match.socket.ts`

### Phase 4 — Real-time Chat (Week 7–8)
22. Build `chat.socket.ts`: join room, broadcast message, typing, read receipt
23. `GET /conversations/:id/messages` — cursor-based pagination
24. `POST /conversations/:id/messages` — REST fallback, persists and broadcasts
25. Store all messages in `messages` table for history

### Phase 5 — AI Red Flag Detection (Week 9)
26. Build `ai.service.ts` with `@anthropic-ai/sdk`, Claude model `claude-sonnet-4-6`
27. Build `redFlagPrompts.ts` with system prompt
28. `POST /ai/analyze-conversation/:id` — fetch last 20 messages, run Claude analysis
29. Background trigger: after every 10 messages, auto-scan and emit `redflag:alert` if severity ≥ medium
30. Store results in `red_flag_logs`
31. `POST /ai/analyze-screenshot` — accept OCR text from client, run same analysis

### Phase 6 — Community Ratings (Week 10)
32. Build `community.service.ts`: rating storage, weighted aggregation (recent ratings weighted higher)
33. `POST /community/rate` — women only via `requireRole('woman')`, stores per-quality ratings
34. `node-cron` hourly job: recalculate `man_quality_scores.community_score` and `man_profiles.community_score` via batch SQL UPDATE
35. `GET /community/man/:manId/score` — public score + category breakdown

### Phase 7 — Safety (Week 11)
36. Build `verification.service.ts` — Persona API integration
37. Handle Persona webhook: update `verifications.status`, set `users.is_id_verified = true`
38. Build `safety.socket.ts` — check-in timer events
39. `POST /safety/checkin/start` — store expiry in Redis, schedule job
40. If timer expires without confirm → push alert to emergency contacts via expo-server-sdk
41. Block/report: `POST /community/report` + admin queue

### Phase 8 — Production Hardening (Week 12)
42. `express-rate-limit`: strict on auth (5 req/15min), moderate on AI scan (10/hour)
43. `helmet()` and `cors()` with allowed origins
44. Database indexes: `swipes(swiper_id, target_id)`, `messages(conversation_id, created_at DESC)`, `man_quality_scores(man_profile_id)`, `community_ratings(man_id)`
45. Winston structured logging with request ID tracing
46. Health check endpoint: `GET /health`
47. Docker production build + environment variable docs in `.env.example`

---

## Key Design Decisions

**Knex over Prisma**: The compatibility engine requires a weighted `SUM(score * priority) / SUM(5 * priority)` aggregation with dynamic per-woman weights. Knex supports this natively; Prisma would require raw SQL escape hatches throughout the most critical code path.

**Community scores batch-computed, not live**: Rating writes are cheap; live recalculation on every rating would hit the DB on every swipe that loads a man's profile. A `node-cron` hourly job recalculates via a single `UPDATE man_profiles SET community_score = (SELECT ...)` batch.

**requireRole('woman') on all community endpoints**: Men cannot rate, review, or submit community data. Enforced at middleware level — not just client UI — so no API bypass is possible.

**Redis for Socket.io adapter**: When the server scales horizontally (multiple Node processes), Socket.io without Redis adapter loses cross-process events. Redis adapter ensures a `match:new` event from process A reaches the client connected to process B.

**Score blend rationale (20/40/40)**:
- Self-score (20%): Men inflate; lowest weight
- Quiz score (40%): Scenario-based, harder to game, objective
- Community score (40%): Real behavioral data from real women — the gold standard
