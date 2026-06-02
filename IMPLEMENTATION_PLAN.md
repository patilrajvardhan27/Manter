# Manter — Implementation Plan

## Tech Stack

| Layer | Technology | Why / Cost |
|---|---|---|
| Mobile | React Native + Expo SDK 52 + Expo Router v3 | Single codebase iOS + Android; free |
| State | Zustand | Minimal boilerplate; free |
| Validation | Zod (shared client + server) | Type-safe schemas; free |
| Backend | Node.js + Express + TypeScript | Familiar, fast to ship; free |
| ORM | Prisma | Type-safe DB access + migrations; free |
| Database | PostgreSQL | Reliable relational DB; free on Render/Railway |
| Cache / Sessions | Redis (ioredis) | Session tokens, real-time presence; free tier |
| Real-time Chat | Socket.io | Self-hosted WebSockets; free |
| AI Red Flag Scan | Claude Haiku API | ~$0.001 per chat message scan; pay-per-use |
| File Storage | Cloudflare R2 | 10 GB + 1M reads/month free; $0.015/GB after |
| Auth | JWT + bcrypt | No third-party auth service |
| Push Notifications | Expo Notifications + Firebase FCM | Free |
| Email | Nodemailer + Gmail SMTP | Free for transactional email |
| Image Processing | Sharp (server-side) | Free |
| Deployment | Railway or Render free tier | $0–5/month |

**Estimated monthly cost at launch: $0–10**

---

## Folder Structure

```
manter/
├── mobile/                          # React Native + Expo app
│   ├── app/                         # Expo Router (file-based routing)
│   │   ├── _layout.tsx              # Root layout (auth gate)
│   │   ├── (auth)/                  # Unauthenticated screens
│   │   │   ├── _layout.tsx
│   │   │   ├── welcome.tsx          # Landing / value prop
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── onboarding/
│   │   │       ├── _layout.tsx
│   │   │       ├── role.tsx         # Pick: woman / man
│   │   │       ├── profile.tsx      # Name, age, photos, bio
│   │   │       ├── quiz.tsx         # Behavioral quiz (men only)
│   │   │       └── weights.tsx      # Quality priority weights (women only)
│   │   ├── (tabs)/                  # Main authenticated tab navigator
│   │   │   ├── _layout.tsx
│   │   │   ├── discover.tsx         # Browse scored candidates
│   │   │   ├── matches.tsx          # Matched profiles
│   │   │   ├── chat/
│   │   │   │   ├── index.tsx        # Conversation list
│   │   │   │   └── [matchId].tsx    # Chat room (with AI scan badge)
│   │   │   ├── community.tsx        # Community ratings feed
│   │   │   └── profile/
│   │   │       ├── index.tsx        # My profile
│   │   │       └── edit.tsx
│   │   ├── profile/
│   │   │   └── [userId].tsx         # View another user's public profile
│   │   ├── rate/
│   │   │   └── [userId].tsx         # Rate a man on 23 qualities (women)
│   │   └── safety/
│   │       ├── index.tsx            # Safety hub
│   │       ├── checkin.tsx          # Date check-in timer
│   │       └── contacts.tsx         # Emergency contacts manager
│   │
│   ├── components/
│   │   ├── ui/                      # Reusable primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Sheet.tsx            # Bottom sheet
│   │   ├── cards/
│   │   │   ├── CandidateCard.tsx    # Swipeable profile card
│   │   │   ├── ScoreBreakdown.tsx   # 23-quality score visual
│   │   │   └── CommunityRating.tsx  # Aggregate rating widget
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── RedFlagBanner.tsx    # AI alert banner
│   │   │   └── ChatInput.tsx
│   │   └── safety/
│   │       ├── CheckinTimer.tsx
│   │       └── EmergencyButton.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   ├── useMatches.ts
│   │   └── useSafetyCheckin.ts
│   │
│   ├── store/
│   │   ├── auth.store.ts            # Auth state (JWT, user)
│   │   ├── matches.store.ts
│   │   └── safety.store.ts
│   │
│   ├── lib/
│   │   ├── api.ts                   # Axios instance + interceptors
│   │   ├── socket.ts                # Socket.io client singleton
│   │   ├── storage.ts               # Secure storage helpers
│   │   └── scoring.ts               # Compatibility score calc (client-side preview)
│   │
│   ├── constants/
│   │   ├── qualities.ts             # 23 qualities + 4 research qualities (text, weights)
│   │   ├── quiz.ts                  # Behavioral quiz questions + answer mappings
│   │   └── redFlags.ts              # Red flag category labels
│   │
│   ├── types/
│   │   └── index.ts                 # Shared TS types (re-exports from shared/)
│   │
│   ├── assets/
│   │   ├── fonts/
│   │   └── images/
│   │
│   ├── app.json
│   ├── expo-env.d.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                          # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts                 # Entry point (Express + Socket.io server)
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts       # POST /auth/register, /auth/login, /auth/refresh
│   │   │   ├── users.routes.ts      # GET/PUT /users/:id, profile management
│   │   │   ├── quiz.routes.ts       # GET /quiz/questions, POST /quiz/submit
│   │   │   ├── discover.routes.ts   # GET /discover (scored candidates feed)
│   │   │   ├── matches.routes.ts    # GET /matches, POST /matches/:id/like
│   │   │   ├── chat.routes.ts       # GET /chat/history/:matchId
│   │   │   ├── ratings.routes.ts    # POST /ratings, GET /ratings/:userId
│   │   │   ├── safety.routes.ts     # POST /safety/checkin, /safety/contacts
│   │   │   ├── ai.routes.ts         # POST /ai/scan (red flag analysis)
│   │   │   └── upload.routes.ts     # POST /upload (photos to R2)
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── quiz.controller.ts
│   │   │   ├── discover.controller.ts
│   │   │   ├── matches.controller.ts
│   │   │   ├── chat.controller.ts
│   │   │   ├── ratings.controller.ts
│   │   │   ├── safety.controller.ts
│   │   │   ├── ai.controller.ts
│   │   │   └── upload.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── scoring.service.ts   # Compatibility score algorithm (23 qualities)
│   │   │   ├── ai.service.ts        # Claude Haiku API — red flag detection
│   │   │   ├── matching.service.ts  # Match creation + candidate filtering
│   │   │   ├── notifications.service.ts  # Expo push + FCM
│   │   │   ├── safety.service.ts    # Check-in timers + emergency alert logic
│   │   │   ├── upload.service.ts    # R2 presigned URL generation + Sharp resize
│   │   │   └── email.service.ts     # Nodemailer transactional email
│   │   │
│   │   ├── socket/
│   │   │   ├── index.ts             # Socket.io server setup + auth middleware
│   │   │   ├── chat.handler.ts      # message:send, message:read events
│   │   │   └── presence.handler.ts  # online/offline/typing events
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT verify + attach req.user
│   │   │   ├── role.middleware.ts   # requireRole('woman') / requireRole('man')
│   │   │   ├── validate.middleware.ts  # Zod request validation
│   │   │   └── rateLimit.middleware.ts # express-rate-limit (abuse prevention)
│   │   │
│   │   └── lib/
│   │       ├── prisma.ts            # Prisma client singleton
│   │       ├── redis.ts             # ioredis client singleton
│   │       ├── r2.ts                # Cloudflare R2 S3 client
│   │       └── claude.ts            # Anthropic SDK client
│   │
│   ├── prisma/
│   │   ├── schema.prisma            # Full database schema
│   │   └── migrations/              # Auto-generated by prisma migrate
│   │
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
└── shared/                          # Shared types + Zod schemas
    ├── schemas/
    │   ├── auth.schema.ts
    │   ├── user.schema.ts
    │   ├── rating.schema.ts
    │   └── chat.schema.ts
    └── types/
        └── index.ts                 # All shared TypeScript interfaces
```

---

## Database Schema (Prisma)

```prisma
// server/prisma/schema.prisma

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  phone         String?  @unique
  passwordHash  String
  role          Role     // WOMAN | MAN
  name          String
  age           Int
  bio           String?
  photos        String[] // R2 URLs
  city          String?
  lat           Float?
  lng           Float?
  isVerified    Boolean  @default(false)
  idVerified    Boolean  @default(false)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  manProfile    ManProfile?
  womanProfile  WomanProfile?
  ratingsGiven  Rating[]     @relation("Rater")
  ratingsRcvd   Rating[]     @relation("Rated")
  matchesAsWoman Match[]     @relation("Woman")
  matchesAsMan   Match[]     @relation("Man")
  reports       Report[]     @relation("Reporter")
  reported      Report[]     @relation("Reported")
  checkins      SafetyCheckin[]
  emergencyContacts EmergencyContact[]
}

model ManProfile {
  id              String  @id @default(cuid())
  userId          String  @unique
  user            User    @relation(fields: [userId], references: [id])
  // Self-assessed quality scores (1-10 per quality, set during quiz)
  qualityScores   Json    // { q1: 8, q2: 7, ... q23: 9 }
  quizAnswers     Json    // Raw behavioral quiz responses
  communityScore  Float   @default(0) // Computed from all ratings received
  ratingCount     Int     @default(0)
}

model WomanProfile {
  id              String  @id @default(cuid())
  userId          String  @unique
  user            User    @relation(fields: [userId], references: [id])
  // Priority weights for each quality (1=low, 5=high priority)
  qualityWeights  Json    // { q1: 5, q2: 3, ... q23: 4 }
}

model Rating {
  id            String   @id @default(cuid())
  raterId       String
  rater         User     @relation("Rater", fields: [raterId], references: [id])
  ratedId       String
  rated         User     @relation("Rated", fields: [ratedId], references: [id])
  // Per-quality scores from real dating experience (1-10 each)
  qualityScores Json     // { q1: 9, q2: 6, ... q23: 8 }
  overallScore  Float
  reviewText    String?
  isAnonymous   Boolean  @default(true)
  createdAt     DateTime @default(now())

  @@unique([raterId, ratedId])
}

model Match {
  id                String      @id @default(cuid())
  womanId           String
  woman             User        @relation("Woman", fields: [womanId], references: [id])
  manId             String
  man               User        @relation("Man", fields: [manId], references: [id])
  status            MatchStatus @default(PENDING) // PENDING | MATCHED | DECLINED
  compatibilityScore Float       // Computed at match creation
  womanLiked        Boolean     @default(false)
  manLiked          Boolean     @default(false)
  createdAt         DateTime    @default(now())
  messages          Message[]

  @@unique([womanId, manId])
}

model Message {
  id              String   @id @default(cuid())
  matchId         String
  match           Match    @relation(fields: [matchId], references: [id])
  senderId        String
  content         String
  redFlagScore    Float?   // 0-1, set by Claude scan
  redFlagsFound   Json?    // Array of flag categories detected
  readAt          DateTime?
  createdAt       DateTime @default(now())
}

model SafetyCheckin {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  dateWithUserId    String?   // Optional: man they're meeting
  scheduledAt       DateTime  // When alert fires if not confirmed
  confirmedAt       DateTime?
  alertSent         Boolean   @default(false)
  createdAt         DateTime  @default(now())
}

model EmergencyContact {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  name      String
  phone     String
  relation  String
}

model Report {
  id          String       @id @default(cuid())
  reporterId  String
  reporter    User         @relation("Reporter", fields: [reporterId], references: [id])
  reportedId  String
  reported    User         @relation("Reported", fields: [reportedId], references: [id])
  reason      ReportReason
  details     String?
  status      ReportStatus @default(PENDING)
  createdAt   DateTime     @default(now())
}

model Block {
  id          String   @id @default(cuid())
  blockerId   String
  blockedId   String
  createdAt   DateTime @default(now())

  @@unique([blockerId, blockedId])
}

enum Role          { WOMAN MAN }
enum MatchStatus   { PENDING MATCHED DECLINED }
enum ReportReason  { HARASSMENT FAKE_PROFILE INAPPROPRIATE_CONTENT THREATENING CATFISH OTHER }
enum ReportStatus  { PENDING REVIEWED ACTIONED DISMISSED }
```

---

## Compatibility Scoring Algorithm

Located in `server/src/services/scoring.service.ts`:

```
compatibilityScore = Σ ( qualityWeight[i] × communityScore[i] ) / Σ qualityWeight[i]

where:
  qualityWeight[i]   = woman's priority weight for quality i  (1–5)
  communityScore[i]  = man's community-rated score for quality i (1–10)
                       falls back to his self-assessed score if < 3 community ratings
```

Women with different priorities see different rankings. A woman who weights loyalty 5/5 will see loyal men ranked higher, even if they score lower on humor.

---

## AI Red Flag Detection

Located in `server/src/services/ai.service.ts`:

- Model: `claude-haiku-4-5` (cheapest, fast enough for chat analysis)
- Triggered: After every message sent in a match
- Input: Last 10 messages in the conversation (context window)
- Output: `{ score: 0–1, flags: string[], explanation: string }`
- Flag categories: controlling_language, anger_escalation, guilt_trip, rushes_intimacy, dismisses_feelings, possessiveness, social_misogyny
- If score > 0.7: show RedFlagBanner in chat with explanation
- Cost: ~$0.0005 per scan (Haiku input pricing), negligible at early scale

---

## Implementation Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Monorepo setup (pnpm workspaces: mobile, server, shared)
- [ ] PostgreSQL + Redis local setup (Docker Compose)
- [ ] Prisma schema + first migration
- [ ] Auth API: register, login, refresh token (JWT + bcrypt)
- [ ] Expo app scaffold with Expo Router
- [ ] Auth flow screens: welcome, login, register
- [ ] JWT auth store (Zustand + SecureStore)

### Phase 2 — Profiles & Onboarding (Week 3–4)
- [ ] Onboarding flow: role selection → profile → quiz (men) / weights (women)
- [ ] 23-quality behavioral quiz for men (scenario-based questions)
- [ ] Quality priority weight setter for women (slider UI)
- [ ] Photo upload: Sharp resize on server → R2 storage
- [ ] Profile view screen (my profile + others)
- [ ] ManProfile + WomanProfile DB population

### Phase 3 — Discover & Matching (Week 5–6)
- [ ] Compatibility scoring service
- [ ] Discover feed API (filtered, scored, paginated candidates)
- [ ] Candidate card UI with score breakdown
- [ ] Like/pass action → match creation when mutual
- [ ] Matches list screen
- [ ] Block + report system

### Phase 4 — Chat (Week 7–8)
- [ ] Socket.io server setup + auth middleware
- [ ] Chat room UI with MessageBubble components
- [ ] Real-time message send/receive
- [ ] Typing indicators + online presence
- [ ] Message history persistence (PostgreSQL)
- [ ] Read receipts

### Phase 5 — AI Red Flag Detection (Week 9)
- [ ] Claude Haiku API integration (ai.service.ts)
- [ ] Per-message scan trigger in chat handler
- [ ] RedFlagBanner component in chat UI
- [ ] Red flag history on profile page

### Phase 6 — Community Ratings (Week 10)
- [ ] Rate-a-man flow (women only, post-date)
- [ ] Community score computation + update on new rating
- [ ] Rating display on profile (anonymous, aggregate per quality)
- [ ] Community feed screen

### Phase 7 — Safety Features (Week 11)
- [ ] Date check-in: timer setup, countdown, confirm/alert
- [ ] Emergency contacts CRUD
- [ ] Alert dispatch (SMS via Twilio free tier or email fallback)
- [ ] Biometric app lock (expo-local-authentication)
- [ ] Screenshot detection flag in chat (best-effort on Android)

### Phase 8 — Polish & Launch Prep (Week 12)
- [ ] Push notifications (Expo + FCM)
- [ ] Email notifications (Nodemailer)
- [ ] Rate limiting + abuse prevention
- [ ] App store assets (icon, splash, screenshots)
- [ ] EAS Build (iOS + Android production builds)
- [ ] Deploy backend to Railway/Render

---

## Environment Variables

```env
# server/.env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...

ANTHROPIC_API_KEY=...            # Claude Haiku red flag scanning

R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=manter-media
R2_PUBLIC_URL=https://...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

FCM_SERVER_KEY=...               # Firebase push notifications
EXPO_ACCESS_TOKEN=...
```

---

## Key Dependencies

### mobile/package.json
```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "react-native": "0.76.x",
  "expo-secure-store": "~14.0.0",
  "expo-local-authentication": "~15.0.0",
  "expo-image-picker": "~16.0.0",
  "expo-notifications": "~0.29.0",
  "expo-camera": "~16.0.0",
  "zustand": "^5.0.0",
  "axios": "^1.7.0",
  "socket.io-client": "^4.7.0",
  "zod": "^3.23.0",
  "@gorhom/bottom-sheet": "^5.0.0",
  "react-native-reanimated": "~3.16.0",
  "react-native-gesture-handler": "~2.20.0"
}
```

### server/package.json
```json
{
  "express": "^4.21.0",
  "@types/express": "^5.0.0",
  "prisma": "^6.0.0",
  "@prisma/client": "^6.0.0",
  "ioredis": "^5.4.0",
  "socket.io": "^4.7.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "zod": "^3.23.0",
  "@anthropic-ai/sdk": "^0.32.0",
  "@aws-sdk/client-s3": "^3.700.0",
  "@aws-sdk/s3-request-presigner": "^3.700.0",
  "sharp": "^0.33.0",
  "nodemailer": "^6.9.0",
  "express-rate-limit": "^7.4.0",
  "helmet": "^8.0.0",
  "cors": "^2.8.5",
  "multer": "^1.4.5"
}
```

---

## Cost Summary

| Service | Free Tier | Cost After |
|---|---|---|
| Render / Railway (backend + DB) | Free tier available | ~$7/month |
| Cloudflare R2 | 10 GB, 1M reads/month | $0.015/GB |
| Claude Haiku API | Pay-per-use | ~$0.001 per scan |
| Firebase FCM | Unlimited | Free |
| Expo EAS Build | 30 builds/month | Free |
| **Total at launch** | **$0** | **<$10/month** |
