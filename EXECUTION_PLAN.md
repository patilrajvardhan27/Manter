# MANTER — Full Execution Plan
## "Find Men Worth Your Standards"

---

## VISION STATEMENT

Manter is not a swipe app. It is a verification-first matchmaking platform where women set their non-negotiables across 23 character qualities and the algorithm surfaces only men who genuinely qualify. Every man on Manter has been quizzed, scored, and rated by real women. Every conversation is AI-monitored for red flags in real time.

**Tagline options:**
- "Men verified. Standards met."
- "You set the bar. We find who clears it."
- "No more guessing. Just good men."

---

## TECH STACK

### Complete Technology Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         MANTER STACK                            │
├──────────────────────────┬──────────────────────────────────────┤
│        CLIENT            │             SERVER                   │
│  React Native + Expo     │  Node.js 20 + Express + TypeScript   │
│  iOS & Android           │  REST API + Socket.io (real-time)    │
├──────────────────────────┴──────────────────────────────────────┤
│                        DATABASE LAYER                           │
│        PostgreSQL 16           Redis 7                          │
│   (users, profiles,        (sessions, socket rooms,            │
│    matches, messages)       rate limits, score cache)           │
├─────────────────────────────────────────────────────────────────┤
│                         AI LAYER                                │
│               Claude API (claude-sonnet-4-6)                    │
│            Red flag detection + conversation analysis           │
├─────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                          │
│  AWS S3 (photos)  │  Persona (ID verify)  │  Twilio (SMS)       │
│  Stripe (payments)│  Expo Push (notifs)   │  Checkr (bg check)  │
└─────────────────────────────────────────────────────────────────┘
```

---

### CLIENT — React Native + Expo

| Category | Technology | Version | Why This Choice |
|---|---|---|---|
| **Framework** | React Native | 0.74.x | Single codebase for iOS + Android |
| **Build System** | Expo (Managed Workflow) | ~51.0 | No Xcode/Android Studio needed in dev; EAS Build handles native production builds |
| **Navigation** | Expo Router v3 | ^3.0 | File-based routing like Next.js — cleaner than manual stack setup |
| **Language** | TypeScript | ^5.4 | Type safety across 50+ screens and API calls |
| **State — Global** | Zustand | ^4.5 | Lightweight, no boilerplate; perfect for 5 clear state domains |
| **State — Server** | @tanstack/react-query | ^5.x | Caching, background refetch, pagination, optimistic updates |
| **HTTP Client** | Axios | ^1.7 | Interceptor support for automatic silent JWT refresh |
| **Real-time** | socket.io-client | ^4.7 | Matches server Socket.io; room-based chat with reconnection |
| **Forms** | react-hook-form + zod | ^7.x / ^3.23 | Schema-driven validation; minimal re-renders |
| **Animations** | react-native-reanimated v3 | ~3.10 | GPU-accelerated; required for smooth 60fps swipe cards |
| **Gestures** | react-native-gesture-handler | ~2.16 | Works with Reanimated for swipe gesture tracking |
| **Charts** | victory-native | ^41.x | Radar/spider chart for 23-quality visualization |
| **Lists** | @shopify/flash-list | ^1.6 | 10× faster than FlatList for chat message history |
| **Images** | expo-image-picker + expo-image-manipulator | ~15.x / ~12.x | Photo selection + client-side compression before upload |
| **OCR** | react-native-text-recognition | ^1.x | Client-side OCR for screenshot analysis — no raw images sent to server |
| **Storage** | expo-secure-store | ~13.x | Encrypted JWT storage (never AsyncStorage for tokens) |
| **Biometrics** | expo-local-authentication | ~14.x | Face ID / fingerprint lock on app resume |
| **Privacy** | expo-screen-capture | ~7.x | Block screenshots in chat (OS-level) |
| **Notifications** | expo-notifications | ~0.28.x | Push notification registration + in-app handling |
| **Maps** | react-native-maps | ^1.14 | City-level distance display only (no live tracking) |
| **Dates** | dayjs | ^1.11 | Lightweight date formatting (12KB vs moment's 70KB) |

**Why Expo over bare React Native:**
Expo's managed workflow handles camera, notifications, biometrics, secure storage, and screen capture without requiring native module linking. During development: no Xcode/Android Studio needed. For production: `eas build` compiles the native binary on Expo's cloud servers. Best tradeoff for a small team building v1.

**Why Zustand over Redux:**
Redux Toolkit would be 3× the boilerplate for 5 state domains (auth, profile, matching, chat, notifications). Zustand stores are plain functions — no actions, reducers, or selectors ceremony.

---

### SERVER — Node.js + Express

| Category | Technology | Version | Why This Choice |
|---|---|---|---|
| **Runtime** | Node.js | 20 LTS | Long-term support; async I/O ideal for real-time chat |
| **Language** | TypeScript | ^5.4 | Type safety on DB models, API contracts, socket events |
| **HTTP Framework** | Express.js | ^4.19 | Mature, minimal, large middleware ecosystem |
| **Real-time** | Socket.io | ^4.7 | Room-based events, built-in reconnection, Redis adapter for scale |
| **Socket Scaling** | @socket.io/redis-adapter | ^8.3 | Multi-process socket event delivery via Redis pub/sub |
| **Query Builder** | Knex.js | ^3.1 | Full SQL control for weighted aggregation queries that ORMs can't do cleanly |
| **Database Driver** | pg (node-postgres) | ^8.12 | PostgreSQL driver used by Knex |
| **Cache / Queue** | ioredis | ^5.4 | Redis client — sessions, Socket.io adapter, check-in timers, rate limit state |
| **Auth — Passwords** | bcryptjs | ^2.4 | Industry-standard password hashing (12 salt rounds) |
| **Auth — Tokens** | jsonwebtoken | ^9.0 | JWT sign/verify for access + refresh token pair |
| **Validation** | zod | ^3.23 | Runtime validation of env vars and request bodies |
| **File Upload** | multer | ^1.4 | Multipart form handling for photo uploads |
| **Image Processing** | sharp | ^0.33 | Server-side resize to 800px max before S3 storage |
| **AI** | @anthropic-ai/sdk | ^0.24 | Official Claude API SDK — red flag detection |
| **Push Notifications** | expo-server-sdk | ^3.10 | Send push notifications to Expo apps |
| **Scheduled Jobs** | node-cron | ^3.0 | Hourly community score recalculation; no need for Bull/Redis queues in v1 |
| **Security** | helmet | ^7.1 | HTTP security headers (XSS, CSRF, clickjacking protection) |
| **Security** | cors | ^2.8 | Restrict API to known origins |
| **Rate Limiting** | express-rate-limit | ^7.3 | 5 req/15min on auth, 10/hour on AI scan, 100/15min general |
| **Logging** | morgan + winston | ^1.10 / ^3.13 | Request logging + structured JSON logs |
| **Dev Server** | nodemon + ts-node | ^3.1 / ^10.9 | Hot reload during development |

**Why Knex over Prisma:**
The compatibility algorithm requires `SUM(man_score × woman_priority) / SUM(5 × woman_priority)` — a dynamic weighted aggregation with per-woman priority weights. Prisma's query API cannot express this without raw SQL escape hatches. Knex exposes full SQL with the safety of a query builder.

**Why Express over Fastify / NestJS:**
Fastify would be marginally faster, NestJS would add structure — but both add complexity that isn't justified for v1. Express is the lowest-friction choice with the largest middleware ecosystem.

---

### DATABASE — PostgreSQL + Redis

| Database | Use Cases |
|---|---|
| **PostgreSQL 16** | Users, profiles, quality scores, matches, swipes, messages, community ratings, red flag logs, verifications |
| **Redis 7** | JWT refresh token blacklist, Socket.io pub/sub adapter, safety check-in timers (key TTL), rate limit counters, green flag score cache |

**Why PostgreSQL over MongoDB:**
The matching algorithm is inherently relational — quality scores JOIN to woman priorities JOIN to man profiles. MongoDB's document model would require application-side joins (slow) or denormalized data (hard to update). PostgreSQL's JSONB columns handle the flexible parts (photos array, AI analysis output) while keeping relational integrity for scores.

**Why Redis alongside PostgreSQL:**
- Socket.io needs a pub/sub layer to broadcast events across multiple server processes
- JWT refresh token blacklisting needs fast key-value lookup with TTL
- Safety check-in timers use Redis key expiry (automatic trigger when key expires)
- All three of these are natural Redis use cases — no other tool does them as cleanly

---

### AI — Claude API

| Model | Use Case | Why |
|---|---|---|
| `claude-sonnet-4-6` | Red flag detection in conversations | Best balance of accuracy + speed + cost for real-time analysis |
| `claude-sonnet-4-6` | Screenshot text analysis | Same model, different prompt — OCR text analyzed for manipulation patterns |

**Why Claude over GPT-4 / Gemini:**
Claude is specifically trained to be helpful, harmless, and honest — critical properties for a safety tool analyzing sensitive relationship conversations. Claude's refusal behavior for harmful outputs is more predictable, which matters when the output drives UI alerts shown to potentially vulnerable users.

**Cost estimate:**
- Average conversation scan (20 messages): ~500 input tokens + 100 output = ~600 tokens
- At $3/million input tokens for Sonnet: ~$0.0018 per scan
- 10 scans/conversation average: ~$0.018 per match total
- 10,000 active matches: ~$180/month in AI costs at scale

**Privacy design:**
Screenshots OCR'd on-device. Only text reaches the API. No images of private conversations ever transmitted to Anthropic.

---

### EXTERNAL SERVICES

| Service | Purpose | Pricing Model |
|---|---|---|
| **AWS S3** | Profile photos, screenshot evidence for reports | ~$0.023/GB/month + $0.0004 per 1000 requests |
| **AWS CloudFront** | CDN for photo delivery | ~$0.0085/GB data transfer |
| **Persona** | Government ID verification for men | ~$1.50–$3.00 per verification (volume discounts) |
| **Twilio** | SMS to emergency contacts on failed safety check-in | ~$0.0079 per SMS (India) |
| **Stripe** | Subscription billing (women's premium + men's access) | 2.9% + $0.30 per transaction |
| **Expo Push** | Push notifications via Expo's infrastructure | Free up to 1M notifications/month |
| **Checkr** | Background checks (v2 feature) | ~$25–$40 per check (US only in v1) |
| **Sentry** | Error monitoring for client + server | Free tier: 5K errors/month |

---

### INFRASTRUCTURE & DEVOPS

| Layer | Technology | Why |
|---|---|---|
| **Local Dev** | Docker + docker-compose | One command spins up postgres + redis locally |
| **Server Hosting** | AWS EC2 (t3.medium) or Railway | EC2 for production control; Railway for faster v1 deployment |
| **Database Hosting** | AWS RDS PostgreSQL | Managed backups, automated failover |
| **Redis Hosting** | AWS ElastiCache or Upstash | Managed Redis — no manual cluster management |
| **CI/CD** | GitHub Actions | Lint + test on every PR; auto-deploy on merge to main |
| **Mobile Builds** | Expo EAS Build | Cloud-based native builds — no Mac required for Android builds |
| **App Distribution** | EAS Submit | Automated submission to App Store + Play Store |
| **Secrets Management** | AWS Secrets Manager (prod) / .env (dev) | Never hardcode credentials |
| **Monitoring** | Sentry (errors) + Winston (logs) | Error tracking + structured server logs |

**Deployment topology (v1):**
```
Internet
   │
   ▼
CloudFront (CDN for photos)
   │
   ▼
Application Load Balancer
   │
   ├─► EC2 t3.medium (Node.js server #1)
   └─► EC2 t3.medium (Node.js server #2)   ← Socket.io via Redis adapter
           │
           ├─► RDS PostgreSQL (primary)
           └─► ElastiCache Redis (cluster)
```

---

### DEVELOPMENT TOOLING

| Tool | Purpose |
|---|---|
| **ESLint + Prettier** | Code style consistency across client + server |
| **Husky + lint-staged** | Pre-commit hooks — lint and format before every commit |
| **Jest** | Unit tests for compatibility algorithm, score blending, AI prompt parsing |
| **Supertest** | HTTP integration tests for API endpoints |
| **Postman / Hoppscotch** | API testing during development |
| **TablePlus** | PostgreSQL GUI for inspecting DB during dev |
| **RedisInsight** | Redis GUI for inspecting session/cache state |
| **Flipper** | React Native debugger — network, storage, layout inspection |
| **Reactotron** | React Native state inspector (Zustand + React Query) |

---

### ENVIRONMENT VARIABLES

**Server `.env`:**
```bash
# Database
DATABASE_URL=postgresql://manter:password@localhost:5432/manter

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_ACCESS_SECRET=<256-bit random string>
JWT_REFRESH_SECRET=<different 256-bit random string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET_NAME=manter-media
CLOUDFRONT_DOMAIN=https://media.manter.app

# AI
ANTHROPIC_API_KEY=<key>

# External Services
PERSONA_API_KEY=<key>
PERSONA_WEBHOOK_SECRET=<key>
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<key>

# App
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://manter.app
```

**Client `.env`:**
```bash
EXPO_PUBLIC_API_URL=https://api.manter.app
EXPO_PUBLIC_SOCKET_URL=wss://api.manter.app
EXPO_PUBLIC_SENTRY_DSN=<dsn>
```

---

## UI / DESIGN DIRECTION

### Aesthetic Identity: "Refined Power"

Manter should feel nothing like Tinder or Bumble. The visual identity must communicate:
**safety + intelligence + feminine authority**

| Design Token | Decision | Reasoning |
|---|---|---|
| Primary background | `#0D0A0E` — near-black deep plum | Luxurious, safe, not clinical |
| Surface / cards | `#1A1520` — dark muted violet | Depth without coldness |
| Accent — primary | `#C9956C` — warm terracotta gold | Warmth, confidence, not aggressive pink |
| Accent — secondary | `#E8D5C4` — dusty rose ivory | Softness, femininity |
| Green flag color | `#7EC8A4` — sage green | Trust, health, positivity |
| Red flag color | `#E07070` — muted coral red | Warning without panic |
| Heading font | `Cormorant Garamond` (serif) | Editorial, intelligent, elevated |
| Body font | `DM Sans` | Clean, modern legibility |
| Label / badge font | `Space Mono` (monospace) | Technical precision for scores |

### App Feel
- **No rainbow gradients.** No neon. No generic purple-on-white.
- Dark mode only for core app. Onboarding can use light cream.
- Cards have **subtle inner glow** rather than hard drop shadows.
- Score badges use `Space Mono` — makes numbers feel precise and data-driven.
- Animations are **slow and intentional** — not bouncy or playful. Smooth 400ms ease curves.
- Green flag scores animate counting up when a man's profile loads (like a progress bar filling).

### Key Screen Impressions
- **Discover screen**: Dark background, man's photo fills 70% of screen, quality score badge floats bottom-right in terracotta gold. No giant like/dislike buttons — subtle gesture-based only.
- **Profile detail**: Scrollable. Photo → bio → spider chart of 23 qualities → community reviews. The spider chart glows sage green on high scores.
- **Chat screen**: Dark. Messages in warm ivory bubbles. Red flag banner slides in from top with a muted coral color if AI detects something.
- **Onboarding for women**: Light cream background, serif headings, feels like a wellness app intake form — not a typical dating app signup.

---

## FEATURE SPECIFICATIONS

### FEATURE 1 — Role-Based Registration

**What it does:**
Two separate sign-up flows — Woman and Man — with completely different onboarding paths.

**Woman flow:**
1. Email + password
2. Name, age, city, photos (min 2)
3. Quality Priority Setup: rate each of 23 qualities on importance (1 = nice to have → 5 = must-have)
4. Dealbreaker Setup: toggle which qualities are absolute dealbreakers
5. Preferences: age range, max distance
6. Done — enter discover feed

**Man flow:**
1. Email + password
2. Name, age, city, photos (min 3, face must be clear)
3. Self-rate on 23 qualities (slider 1–5)
4. Behavior Quiz: 5 scenario questions (no "right answers" shown — patterns scored by algorithm)
5. ID Verification prompt (can skip but score is lower, badge missing)
6. Done — profile enters "pending" state, visible after review

**Behavior Quiz — 5 Scenarios:**
```
Q1: "Your partner gets offered her dream job in another city at 3× your salary. You..."
  A) Celebrate and discuss how to make it work together
  B) Feel proud but worry about the long distance
  C) Feel threatened and try to talk her out of it
  D) Agree if she finds a way to keep the relationship normal

Q2: "She says she doesn't want children. You disagree. You..."
  A) Respect her decision — it's her body and her life
  B) Have an honest conversation about compatibility
  C) Hope she'll change her mind eventually
  D) Make it clear this is a dealbreaker for you before going further

Q3: "Your friends make a sexist joke about women at the table. You..."
  A) Call it out directly
  B) Change the subject
  C) Laugh along to avoid awkwardness
  D) Address it privately later

Q4: "She says she's not comfortable with something you asked. You..."
  A) Immediately back off and thank her for telling you
  B) Ask if she wants to talk about it
  C) Feel a bit hurt but respect it
  D) Try to understand her reasoning first

Q5: "She outperforms you professionally. You..."
  A) Feel genuinely proud — her success is exciting
  B) Need a moment but come around
  C) Feel competitive but keep it to yourself
  D) Make sure she knows you support her
```

Scoring: Answers are weighted and mapped to relevant qualities (Q1 → supportive_of_success + respects_decisions, Q2 → respects_boundaries, Q3 → no_misogyny, Q4 → respects_boundaries + no_controlling, Q5 → supportive_of_success + no_ego).

---

### FEATURE 2 — Green Flag Score System

**What it does:**
Every man on Manter has a single visible "Green Flag Score" (0–100) that aggregates across all 23 qualities.

**Score components per quality:**
```
final_score = (self_score × 0.20) + (quiz_score × 0.40) + (community_score × 0.40)
```

**Overall Green Flag Score:**
```
green_flag_score = average(all 23 final_scores) × 20
```
Displayed as: **87 / 100** with a green badge.

**Score tiers:**
| Range | Label | Badge Color |
|---|---|---|
| 90–100 | Exceptional | Bright sage green |
| 75–89 | Strong Green Flags | Sage green |
| 60–74 | Promising | Amber/gold |
| 45–59 | Mixed Signals | Warm grey |
| Below 45 | Needs Work | Not shown in feed |

**Where it appears:**
- Small badge on swipe card (bottom-right corner)
- Large prominent display on profile detail page
- Spider chart showing per-quality scores across 9 categories

**Quality Categories (9 groups of 23):**
1. Respect & Autonomy (Q1, Q2, Q11)
2. Emotional Maturity (Q9, Q14, Q18)
3. Support & Loyalty (Q3, Q4, Q6)
4. Presence & Connection (Q5, Q7, Q10, Q12)
5. Social Character (Q13, Q16, Q21, Q22, Q23)
6. Women's Understanding (Q15)
7. Practical Partnership (Q19, Q20)
8. Future Orientation (Q8, Q17)

---

### FEATURE 3 — Compatibility Matching Algorithm

**What it does:**
When a woman opens the Discover feed, she sees men **ranked by her personal compatibility score** — not by recency or random selection.

**Algorithm:**
```
For each of the 23 qualities:
  weighted_score[quality] = man.final_score[quality] × woman.priority[quality]

compatibility = SUM(weighted_score) / SUM(5 × woman.priority) × 100

Dealbreaker rule: IF woman marked quality as dealbreaker
                  AND man.final_score < 3.0
                  THEN compatibility = 0  (man not shown)

Bonus modifiers:
  +5% if community_score > 4.5
  +3% if ID verified
  +2% if quiz_score > 80%

Final: min(raw + modifiers, 100)
```

**Result:**
- Woman sees "94% compatible" on a card — she knows exactly why (hover/tap reveals category breakdown)
- Candidates ranked highest-to-lowest compatibility
- Dealbreaker men are completely filtered out of her feed — she never sees them

---

### FEATURE 4 — Discover Feed (Swipe Interface)

**What it does:**
Women browse ranked candidate cards. Each card shows:
- Photo (large, 70% of screen)
- Name and age
- City
- Green Flag Score badge
- Top 3 matching qualities (e.g. "Emotionally Mature · Reliable · Supportive")
- Compatibility percentage

**Gesture controls:**
- Swipe right = Like
- Swipe left = Pass
- Swipe up = Super Like (3 per day, free; unlimited premium)
- Tap card = Open full profile

**Full profile view:**
- All photos (swipeable gallery)
- Bio
- City + distance
- Green Flag Score with animated fill
- Spider chart (radar chart) of all 9 quality categories
- Top 5 strongest qualities (highlighted)
- Community review count + avg rating
- Verification badges (ID verified, background check)

**Match trigger:**
When both users like each other → animated match screen → conversation auto-created

---

### FEATURE 5 — Real-Time Chat

**What it does:**
Standard 1:1 messaging between matched users. Built on Socket.io for real-time delivery.

**Chat features:**
- Text messages
- Image sharing (photos — no videos in v1)
- Typing indicator
- Read receipts (double checkmark)
- Message timestamps
- Online/last seen status

**AI Safety Layer (auto-runs every 10 messages):**
The app silently scans the last 20 messages using Claude AI.
- If severity = `low`: No alert shown, logged internally
- If severity = `medium`: Subtle banner at top of chat — "Heads up — some patterns worth noting. Tap to review."
- If severity = `high`: Full-screen overlay before she reads next message — shows specific behaviors detected + recommendation
- If severity = `critical`: Block prompt + direct path to report

**Manual AI scan:**
Women can tap a shield icon in the chat input bar to manually trigger a full AI analysis of the conversation at any time.

**Screenshot Upload:**
"Analyze from another app" — woman picks a screenshot from her gallery → OCR extracts text client-side → sent to Claude API → result shown with severity + detected patterns.

---

### FEATURE 6 — Community Ratings

**What it does:**
After a date or ending a match, women can anonymously rate a man on any or all of the 23 qualities. These ratings contribute 40% of his final scores.

**Rating flow (post-date):**
1. Woman ends match or navigates to "Rate [Name]"
2. Shown each of 9 category groups
3. Rate each relevant quality 1–5 stars
4. Optional context note (100 chars max, anonymous)
5. Date of meeting (for freshness weighting — recent ratings weighted more)

**Freshness weighting:**
Ratings from the past 6 months count at 100%. 6–12 months: 80%. 12–24 months: 50%. Over 2 years: 20%.

**Public community profile (visible to women):**
- Overall community score
- Per-category breakdown (bar chart)
- Number of ratings
- Anonymous context notes (moderated)
- "X women rated him" (number only — no names ever)

**Moderation:**
- Suspected retaliatory ratings (rated within 24h of unmatch) are flagged for manual review
- Ratings require a match history to submit (prevents anonymous targeting)

---

### FEATURE 7 — AI Red Flag Detection

**What it does:**
Uses Claude AI (`claude-sonnet-4-6`) to analyze conversations for 15 behavioral red flag patterns in real time.

**Patterns detected:**
1. Controlling language ("you should wear X", "I decide", "I don't allow")
2. Anger escalation (calm → aggressive when told no)
3. Guilt-tripping after a "no" ("I thought you cared about me", "after everything I did")
4. Rushed intimacy (pushing physical/emotional closeness too fast)
5. Dismissiveness ("you're overreacting", "you're too sensitive")
6. Possessiveness / jealousy ("who were you with?", "why didn't you reply?")
7. Social misogyny (jokes about women, "females" language)
8. Gaslighting ("that never happened", "you're imagining things")
9. Love bombing (excessive flattery, "I've never felt this way about anyone")
10. Boundary pressure ("just this once", "come on, don't be like that")
11. Future faking (big promises very early — moving in together, marriage, etc.)
12. Financial manipulation (offering money in exchange for anything)
13. Disrespect of "no" (continuing after clear refusal)
14. Negging (backhanded compliments designed to lower confidence)
15. Isolation attempts ("your friends don't really care about you")

**Claude prompt structure:**
```
System: You are a safety assistant for a women-first dating app.
Analyze the conversation below for red flag patterns.
Focus on power dynamics, control, and boundary violations.
Look specifically for: [list of 15 patterns]

Return ONLY valid JSON:
{
  "severity": "low" | "medium" | "high" | "critical",
  "behaviors": ["behavior1", "behavior2"],
  "explanation": "Plain-language explanation of what was detected",
  "recommendation": "What the woman should consider doing"
}

User: [last 20 messages as formatted text]
```

**Privacy:** Screenshots are OCR'd on the client device. Only extracted text is sent to the API. No images of private conversations ever leave the device.

---

### FEATURE 8 — ID Verification

**What it does:**
Men can optionally complete an identity verification via **Persona** (3rd-party ID verification service).

**Process:**
1. Man taps "Get Verified" in profile
2. Redirected to Persona's in-app browser flow
3. Takes selfie + photos government ID
4. Persona processes and returns webhook to Manter server
5. If approved: `users.is_id_verified = true`
6. Blue verified badge appears on his profile

**Why optional:**
Making it mandatory reduces sign-up. Making it visible and rewarded (better placement in feed, +3% compatibility bonus, "Verified" badge women filter for) creates strong incentive without blocking access.

**Background Check (v2 feature):**
Integration with Checkr API for criminal record checks in markets where available.

---

### FEATURE 9 — Safety Check-In

**What it does:**
Before a first date, women can activate a timed safety check-in. If she doesn't confirm she's safe before the timer runs out, her emergency contacts are automatically notified.

**Flow:**
1. Woman taps "I have a date" in the Safety tab
2. Sets duration (e.g. 2 hours)
3. Adds up to 2 emergency contacts (name + phone)
4. Timer starts — she gets a push notification at T-15 minutes as a reminder
5. On expiry: app sends SMS to emergency contacts with her last known city and a message: "Hey, [Name] set a safety check-in on Manter and hasn't confirmed she's safe. Please check on her."
6. She can confirm safe anytime → timer cancelled, contacts NOT notified

**Manual SOS:**
Shake phone 3× → instant alert to all emergency contacts regardless of timer.

**Privacy:**
Emergency contacts never receive her GPS coordinates — only her city (user preference). No live tracking.

---

### FEATURE 10 — Women's Community Forum

**What it does:**
A women-only space (identity-verified via sign-in role) to share advice, warnings, green flag stories, and general support.

**Content types:**
- Green flag sighting: "Met a guy who cooked dinner and offered to split the bill without being asked 🌿"
- Warning: "Anyone else matched with [first name only, no last name policy] from Mumbai? Here's what happened..."
- Advice thread: "How do you handle men who seem great but their actions don't match words?"
- Celebration: "Matched with someone who scored 94% on my priorities and it's been 3 months and he's everything"

**Moderation:**
- No full names allowed in posts
- No photos of men allowed (privacy + potential misuse)
- AI moderation scans posts for doxxing, false accusations, and content that could harm
- Women can report posts

---

### FEATURE 11 — Push Notifications

**Events that trigger push notifications:**

| Event | Notification |
|---|---|
| New match | "You matched with [Name]! 94% compatible." |
| New message | "[Name]: [first 40 chars of message]" |
| Red flag detected (medium+) | "Heads up — Manter detected some patterns in your conversation with [Name]. Tap to review." |
| Safety check-in reminder | "Your safety check-in expires in 15 minutes. Tap to confirm you're safe." |
| New community review on your profile (men) | "A woman left a review on your profile" |
| ID verification approved | "Your profile is now Verified!" |
| Super Like received | "[Name] super liked you!" |

---

### FEATURE 12 — Premium Subscriptions

**For Women — Manter Premium ($12.99/month):**
- Unlimited AI red flag scans per day (free: 3/day)
- See who liked you before matching
- Advanced filters: "Only ID Verified", "Community Score 4+", quality category filters
- Super Likes: unlimited (free: 3/day)
- Read receipts always visible (free: only first 24h)
- Priority placement in discover feeds

**For Men — Manter Access ($9.99/month after 14-day free trial):**
- Required to remain active on platform after trial
- Visibility in women's discover feeds
- Unlimited right swipes (trial: 20/day)
- See partial compatibility score breakdown
- Boost (3/month): appear at top of local feeds for 30 minutes

**Why men pay:**
- Creates accountability — bad actors don't pay for apps they'll get banned from
- Signals genuine intention — men on paid apps are more serious
- Funds ID verification costs and AI scanning infrastructure

---

## EXECUTION PHASES

---

### PRE-DEVELOPMENT (Week 0)

**Environment Setup:**
```bash
# 1. Install tools
brew install node@20 postgresql redis
npm install -g expo-cli eas-cli

# 2. Clone / init repo
mkdir Manter && cd Manter
git init
echo "node_modules\n.env\ndist\nbuild" > .gitignore

# 3. Create workspace structure
mkdir client server

# 4. Server init
cd server && npm init -y
npm install typescript ts-node @types/node --save-dev
npx tsc --init

# 5. Client init
cd ../client
npx create-expo-app . --template expo-template-blank-typescript

# 6. Start infrastructure
cd ../server && docker-compose up -d
```

**External Accounts to Create:**
- [ ] AWS account → S3 bucket for photos (region: ap-south-1 for India)
- [ ] Anthropic account → API key for Claude
- [ ] Persona account → for ID verification (persona.com)
- [ ] Expo account → for EAS Build and push notifications
- [ ] Stripe account → for subscription payments
- [ ] Twilio account → for SMS emergency contact alerts (safety check-in)

**App Store Accounts:**
- [ ] Apple Developer Program ($99/year) → TestFlight + App Store
- [ ] Google Play Developer ($25 one-time) → Internal Testing + Play Store

---

### PHASE 1 — BACKEND FOUNDATION (Week 1–2)

**Goal:** Working auth system + database + Docker environment

**Step 1.1 — Docker & Database:**
```
server/
├── docker-compose.yml      ← postgres:16 + redis:7 + server
├── src/config/
│   ├── database.ts         ← Knex connection pool
│   ├── redis.ts            ← ioredis singleton
│   └── env.ts              ← Zod-validated env vars (fail fast on missing)
└── src/db/migrations/      ← Run all 14 migrations
```

Run:
```bash
docker-compose up -d
npx knex migrate:latest
npx knex seed:run   # seeds 23 quality_definitions
```

Verify: `psql -U manter manter -c "SELECT count(*) FROM quality_definitions;"` → returns 23

**Step 1.2 — Auth Service:**
```
POST /api/v1/auth/register   → bcrypt hash, UUID, role
POST /api/v1/auth/login      → bcrypt compare, issue access (15min) + refresh (30d) JWT pair
POST /api/v1/auth/refresh    → verify refresh token from Redis, issue new pair
POST /api/v1/auth/logout     → blacklist refresh token in Redis with TTL
```

**Step 1.3 — Middleware:**
```
authenticate.ts   → verify Bearer JWT, attach req.user
requireRole.ts    → requireRole('woman') blocks men; requireRole('man') blocks women
rateLimiter.ts    → 5 req/15min on /auth/login, 100 req/15min general
```

**Step 1.4 — Test Checklist:**
- [ ] Register woman account → returns user + tokens
- [ ] Register man account → returns user + tokens
- [ ] Login with wrong password → 401
- [ ] Access protected route without token → 401
- [ ] Access woman-only route as man → 403
- [ ] Refresh token rotation works
- [ ] Logout blacklists the token

---

### PHASE 2 — PROFILES & QUALITY SYSTEM (Week 3–4)

**Goal:** Men can build profiles + complete quiz. Women can set quality priorities.

**Step 2.1 — Profile CRUD:**
```
GET  /api/v1/profiles/me              ← own full profile
PUT  /api/v1/profiles/me              ← update name, bio, city, age
POST /api/v1/profiles/me/photos       ← multer → Sharp resize → S3 → CDN URL
```

**Step 2.2 — Man Quality Onboarding:**
```
PUT  /api/v1/profiles/man/qualities   ← { ratings: [{qualityId, selfScore}] }
                                       saves to man_quality_scores.self_score
                                       computes initial final_score = self × 1.0 (no quiz/community yet)

POST /api/v1/profiles/man/quiz        ← { answers: [{questionId, answerId}] }
                                       maps answer choices to quality scores
                                       saves quiz_score per quality
                                       recomputes final_score = (self×0.2) + (quiz×0.4) + (community×0.4)
                                       updates man_profiles.green_flag_score
```

**Step 2.3 — Woman Quality Onboarding:**
```
PUT  /api/v1/profiles/woman/priorities ← { priorities: [{qualityId, priority, isDealbreaker}] }
PUT  /api/v1/profiles/woman/preferences ← { ageMin, ageMax, maxDistanceKm }
```

**Step 2.4 — Client Onboarding Screens:**

*Woman onboarding flow:*
```
WomanSignupScreen → WomanQualitiesSetupScreen → WomanDealbreakersScreen → WomanPreferencesScreen → DiscoverScreen
```

`WomanQualitiesSetupScreen`: Shows all 23 qualities grouped by category. Each quality has a 1–5 slider. Default = 3. Takes ~3 minutes to complete.

*Man onboarding flow:*
```
ManSignupScreen → ManQualitySelfRateScreen → ManBehaviorQuizScreen → ManVerificationScreen → WaitingScreen
```

`ManBehaviorQuizScreen`: One question per screen with card-swipe animation between questions. Progress indicator at top (1/5, 2/5...). Each answer is a card — tap to select, swipe up to confirm.

**Step 2.5 — Test Checklist:**
- [ ] Man submits all 23 self-ratings → scores saved
- [ ] Man completes quiz → quiz_score computed and saved per quality
- [ ] final_score = (self×0.2) + (quiz×0.4) + (0×0.4) before community ratings
- [ ] Man's green_flag_score computed correctly from final_scores
- [ ] Woman saves priorities with 2 dealbreakers set
- [ ] Photo upload → resized to 800px max → stored in S3 → CDN URL returned

---

### PHASE 3 — MATCHING ENGINE (Week 5–6)

**Goal:** Women see a ranked discover feed. Swipes create matches.

**Step 3.1 — Candidate Ranking:**
```
GET /api/v1/matching/candidates?limit=20&cursor=xxx

→ SQL: weighted SUM(man.final_score × woman.priority) / SUM(5 × woman.priority)
→ Filter: exclude swiped men, apply dealbreaker rule, min green_flag_score 45
→ Sort: compatibility DESC
→ Returns: [ { manProfile, compatibilityScore, topQualities[3], badges } ]
```

**Step 3.2 — Swipe Processing:**
```
POST /api/v1/matching/swipe
  { targetId, direction: 'like' | 'pass' | 'superlike' }

Server:
  1. Save swipe to swipes table
  2. If direction is 'like' or 'superlike':
     Check if target has already liked swiper (mutual check)
     If mutual → create match → create conversation → emit 'match:new' via Socket.io
  3. Return { matched: boolean, matchId?: string }
```

**Step 3.3 — Socket.io Setup:**
```javascript
// server/src/config/socket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

// Attach to HTTP server
// Use Redis adapter for multi-process support
// Rooms: user:{userId} for private events
```

**Step 3.4 — Client Discover Screen:**

Card stack using `react-native-reanimated`:
- Top 3 cards pre-loaded in stack
- Drag card: rotates ±15deg, overlays green ✓ or red ✗
- Release past threshold: animate off screen, load next card
- Tap card: expand to full profile modal (spring animation up)
- Long-press top card: see compatibility breakdown modal

**Step 3.5 — Test Checklist:**
- [ ] Discover feed returns candidates sorted by compatibility
- [ ] Dealbreaker man does NOT appear in woman's feed
- [ ] Woman swipes right on man who already liked her → match created
- [ ] Match creation emits `match:new` Socket.io event
- [ ] `NewMatchCelebrationScreen` modal fires on match event

---

### PHASE 4 — REAL-TIME CHAT (Week 7–8)

**Goal:** Matched users can message in real time with typing indicators and read receipts.

**Step 4.1 — Chat Socket Events:**
```javascript
// Client connects and joins room
socket.emit('chat:join', { conversationId })

// Send message
socket.emit('chat:message', { conversationId, content, type: 'text' })

// Server broadcasts to room
socket.to(`conv:${conversationId}`).emit('chat:message', { message })

// Typing
socket.emit('chat:typing', { conversationId, isTyping: true })
socket.to(`conv:${conversationId}`).emit('chat:typing', { userId, isTyping })

// Read receipt
socket.emit('chat:read', { conversationId, messageId })
socket.to(`conv:${conversationId}`).emit('chat:read', { messageId, readAt })
```

**Step 4.2 — Message Persistence:**
Every message received by server → saved to `messages` table → then broadcast.
Guarantees history even if client was offline.

**Step 4.3 — Pagination:**
`GET /api/v1/conversations/:id/messages?limit=30&before=messageId`
Cursor-based (message ID as cursor) for efficient deep history loading.

**Step 4.4 — Client Chat Screen:**
- `@shopify/flash-list` for message rendering (handles 1000+ messages smoothly)
- Messages grouped by day with date separators
- Sender bubble: right-aligned, terracotta gold
- Receiver bubble: left-aligned, dark surface
- Typing indicator: three animated dots
- Red flag banner: slides in from top, `medium` severity only

**Step 4.5 — Test Checklist:**
- [ ] Two users in same conversation receive each other's messages in real time
- [ ] Typing indicator appears and disappears correctly
- [ ] Read receipt updates on both sides
- [ ] Offline user receives messages on reconnect (from DB history)
- [ ] Message history loads with pagination

---

### PHASE 5 — AI RED FLAG DETECTION (Week 9)

**Goal:** Claude AI scans conversations and alerts women to red flag patterns.

**Step 5.1 — AI Service:**
```typescript
// server/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function detectRedFlags(messages: Message[]) {
  const conversationText = messages
    .map(m => `${m.sender_role === 'man' ? 'HIM' : 'HER'}: ${m.content}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: RED_FLAG_SYSTEM_PROMPT,  // from redFlagPrompts.ts
    messages: [{ role: 'user', content: conversationText }],
  });

  return JSON.parse(response.content[0].text);
}
```

**Step 5.2 — Auto-scan Trigger:**
After every 10 messages in a conversation:
```
Count messages since last scan
If count >= 10:
  Fetch last 20 messages
  Run detectRedFlags()
  Save result to red_flag_logs
  If severity >= 'medium':
    Emit 'redflag:alert' to woman's socket room
  Reset message counter
```

**Step 5.3 — Manual Scan:**
`POST /api/v1/ai/analyze-conversation/:id`
Runs immediately on-demand. Returns same structure.

**Step 5.4 — Screenshot Analysis (client-side OCR):**
```typescript
// client/src/screens/chat/ChatAnalysisScreen.tsx
import TextRecognition from 'react-native-text-recognition';

const analyzeScreenshot = async (imageUri: string) => {
  const extractedText = await TextRecognition.recognize(imageUri);
  const result = await aiApi.analyzeScreenshot({ text: extractedText.join('\n') });
  navigation.navigate('RedFlagAlertScreen', { result });
};
```

**Step 5.5 — Test Checklist:**
- [ ] Seed a conversation with gaslighting messages → AI returns severity: 'high'
- [ ] Seed a conversation with normal messages → AI returns severity: 'low'
- [ ] Auto-scan fires after every 10th message in a conversation
- [ ] `redflag:alert` socket event received by woman when severity >= medium
- [ ] RedFlagBanner appears in chat UI on socket event
- [ ] Screenshot OCR extracts text correctly → AI analysis runs

---

### PHASE 6 — COMMUNITY RATINGS (Week 10)

**Goal:** Women can rate men after dates. Scores update his profile.

**Step 6.1 — Rating Submission:**
```
POST /api/v1/community/rate   (women only)
{
  manId: UUID,
  ratings: [{ qualityId: 1, score: 4, contextNote: "Actually listened" }],
  dateOfDate: "2026-05-15"
}

Server:
  1. Verify woman has/had a match with this man (prevents anonymous targeting)
  2. Save ratings to community_ratings
  3. Flag for freshness-weighted recalculation job
```

**Step 6.2 — Score Recalculation (Cron Job):**
```javascript
// node-cron: every hour at :00
cron.schedule('0 * * * *', async () => {
  // For each quality of each man who received ratings in last hour:
  // SELECT AVG(score * freshness_weight) as community_score
  //   FROM community_ratings
  //   WHERE man_id = ?
  //   GROUP BY quality_id
  // UPDATE man_quality_scores SET community_score = ?
  // UPDATE man_quality_scores SET final_score = (self×0.2 + quiz×0.4 + community×0.4)
  // UPDATE man_profiles SET community_score = AVG(all final_scores) × 20
});
```

**Step 6.3 — Client Rating Screen:**
`RateAManScreen` triggered from:
1. Tapping "End match" → "Would you like to rate [Name]?"
2. Community tab → "Rate someone I dated"

UI: Category by category. Each quality shows as a star rating (1–5). Optional 100-char note. "Skip" available for qualities she doesn't have info on.

**Step 6.4 — Test Checklist:**
- [ ] Rating without prior match → 403 error
- [ ] Rating with prior match → saved successfully
- [ ] Cron job runs → final_score and green_flag_score update for rated man
- [ ] Community profile page shows updated score + anonymous notes
- [ ] Freshness weighting: rating from 18 months ago weighted at 50%

---

### PHASE 7 — SAFETY FEATURES (Week 11)

**Goal:** ID verification, safety check-in, emergency contacts, screenshot blocking.

**Step 7.1 — ID Verification (Persona):**
```
POST /api/v1/verification/initiate
  → Create Persona inquiry
  → Return { redirectUrl } for in-app browser

POST /api/v1/verification/webhook  (public, no auth)
  → Persona sends verification result
  → If approved: UPDATE users SET is_id_verified = true
  → Emit push notification to man
```

**Step 7.2 — Safety Check-In:**
```
POST /api/v1/safety/checkin/start
  { durationMinutes: 120, emergencyContacts: [{name, phone}] }
  → Store in Redis: checkin:{checkInId} with TTL = durationMinutes
  → Schedule: at TTL-15min, send push reminder
  → At TTL expiry (Redis keyspace notification): send SMS via Twilio to all contacts

POST /api/v1/safety/checkin/:id/confirm
  → DELETE checkin:{checkInId} from Redis
  → Contacts NOT notified

POST /api/v1/safety/checkin/:id/alert
  → Immediately send Twilio SMS to all contacts
```

**Step 7.3 — Client Safety Screen:**
```
SafetyCheckInScreen:
  - Duration picker (30min, 1hr, 2hr, custom)
  - Emergency contact list (add/remove)
  - "Start Check-In" button → timer UI
  - Timer counts down visibly
  - Big "I'm Safe" confirmation button
  - Shake-to-SOS explanation
```

**Step 7.4 — Screenshot Blocking in Chat:**
```typescript
// client/src/screens/chat/ChatScreen.tsx
import * as ScreenCapture from 'expo-screen-capture';

useEffect(() => {
  ScreenCapture.preventScreenCaptureAsync();
  return () => ScreenCapture.allowScreenCaptureAsync();
}, []);
```

**Step 7.5 — Test Checklist:**
- [ ] Persona webhook received → man's `is_id_verified` = true → badge appears
- [ ] Check-in starts → Redis key set with correct TTL
- [ ] Confirm safe before expiry → Redis key deleted, no SMS
- [ ] Let timer expire → Twilio SMS sent to emergency contact (test number)
- [ ] Screenshots blocked on ChatScreen → OS-level black screen in screenshot

---

### PHASE 8 — POLISH & LAUNCH PREP (Week 12)

**Goal:** Performance, security, push notifications, app store submission.

**Step 8.1 — Security Hardening:**
```javascript
app.use(helmet());
app.use(cors({ origin: ['https://manter.app'], credentials: true }));

// Rate limits
authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });  // auth endpoints
aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });   // AI scan (free tier)
generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
```

**Step 8.2 — Database Indexes:**
```sql
CREATE INDEX idx_swipes_lookup ON swipes(swiper_id, target_id);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_quality_scores_man ON man_quality_scores(man_profile_id);
CREATE INDEX idx_community_ratings_man ON community_ratings(man_id, quality_id);
CREATE INDEX idx_users_email ON users(email);
```

**Step 8.3 — Push Notifications:**
```typescript
// Register device on login
const token = await Notifications.getExpoPushTokenAsync();
await usersApi.saveDeviceToken(token.data);

// Server sends via expo-server-sdk
const expo = new Expo();
await expo.sendPushNotificationsAsync([{
  to: user.device_token,
  title: 'New Match!',
  body: `You matched with ${match.name} — ${match.compatibility}% compatible`,
  data: { type: 'match', matchId },
}]);
```

**Step 8.4 — EAS Build Setup:**
```json
// eas.json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": {}
  }
}
```

Commands:
```bash
eas build --platform ios --profile preview    # TestFlight build
eas build --platform android --profile preview # Play Store internal testing
eas submit --platform ios                      # App Store submission
eas submit --platform android                  # Play Store submission
```

**Step 8.5 — App Store Requirements:**
- [ ] Privacy Policy URL (required by both stores)
- [ ] Terms of Service URL
- [ ] App Store screenshots (6.7" iPhone, 12.9" iPad, 6.7" Android)
- [ ] App description (4000 chars max)
- [ ] Age rating: 17+ (dating app)
- [ ] Data safety section (Android) — document what data is collected
- [ ] App Review notes: explain ID verification flow for reviewers

**Step 8.6 — Pre-Launch Checklist:**
- [ ] All 14 migrations run clean on production DB
- [ ] 23 qualities seeded correctly
- [ ] Environment variables set in production (not .env file)
- [ ] S3 bucket has correct CORS policy
- [ ] Redis persistence enabled (not ephemeral)
- [ ] Persona webhook URL registered in Persona dashboard
- [ ] Expo push notification credentials configured
- [ ] Stripe webhook registered for subscription events
- [ ] Error monitoring (Sentry) configured on both client and server
- [ ] Health check endpoint returns 200
- [ ] Load test: simulate 100 concurrent socket connections

---

## FULL FEATURE LIST (Summary)

| # | Feature | Priority | Phase |
|---|---|---|---|
| 1 | Role-based registration (woman / man) | Core | 1 |
| 2 | Woman quality priority setup (23 qualities, 1–5) | Core | 2 |
| 3 | Man self-rating on 23 qualities | Core | 2 |
| 4 | Behavior quiz (5 scenarios) | Core | 2 |
| 5 | Green Flag Score computation (blended 20/40/40) | Core | 2 |
| 6 | Spider/radar chart of 9 quality categories | Core | 2 |
| 7 | Photo upload (S3 + CDN) | Core | 2 |
| 8 | Compatibility matching algorithm | Core | 3 |
| 9 | Ranked discover feed with compatibility % | Core | 3 |
| 10 | Animated swipe cards (like/pass/superlike) | Core | 3 |
| 11 | Dealbreaker filtering | Core | 3 |
| 12 | Real-time chat (Socket.io) | Core | 4 |
| 13 | Typing indicators + read receipts | Core | 4 |
| 14 | Message history + pagination | Core | 4 |
| 15 | AI red flag detection (Claude API) | Core | 5 |
| 16 | Automatic scan every 10 messages | Core | 5 |
| 17 | Manual AI scan from chat | Core | 5 |
| 18 | Screenshot OCR + analysis | Core | 5 |
| 19 | Red flag severity alerts (banner / overlay) | Core | 5 |
| 20 | Community post-date ratings | Core | 6 |
| 21 | Community score display + reviews | Core | 6 |
| 22 | Freshness-weighted rating aggregation | Core | 6 |
| 23 | ID verification (Persona) | Core | 7 |
| 24 | Safety check-in with SMS alerts | Core | 7 |
| 25 | Emergency contacts | Core | 7 |
| 26 | Screenshot blocking in chat | Core | 7 |
| 27 | Biometric app lock | Core | 7 |
| 28 | Push notifications (match, message, red flag) | Core | 8 |
| 29 | Block + report system | Core | 8 |
| 30 | Women's community forum | V2 | — |
| 31 | Background check integration (Checkr) | V2 | — |
| 32 | Premium subscription (Stripe) | V2 | — |
| 33 | Super Likes with animations | V2 | — |
| 34 | "Who liked me" feature (premium) | V2 | — |
| 35 | Advanced filters (premium) | V2 | — |
| 36 | Boost feature for men (premium) | V2 | — |
| 37 | Video calls (in-app, before first date) | V2 | — |
| 38 | Date planning assistant (AI suggests date ideas) | V3 | — |

---

## TIMELINE OVERVIEW

```
Week 0    ─── Environment + Accounts + Docker setup
Week 1–2  ─── Backend: Auth + Database + Migrations + Seeds
Week 3–4  ─── Backend + Client: Profiles + Quality System + Onboarding
Week 5–6  ─── Backend + Client: Matching Engine + Discover Feed + Swipe
Week 7–8  ─── Backend + Client: Real-time Chat
Week 9    ─── Backend + Client: AI Red Flag Detection
Week 10   ─── Backend + Client: Community Ratings
Week 11   ─── Backend + Client: Safety Features
Week 12   ─── Polish + Security + App Store Submission
─────────────────────────────────────────
Total: 12 weeks to v1 launch
```

---

## TECH DEBT RULES (What to Leave for V2)

Do not build in v1:
- Video calls
- In-app payments (manual verification of payment status is ok for beta)
- Full admin dashboard (use direct DB + basic scripts for moderation in v1)
- Multi-language support
- Web app version
- Analytics dashboard for men (show them their score, basic)

Build these clean in v1 so they extend easily:
- Auth (role system extensible to add 'admin' later)
- Quality definitions (seeded table — add more qualities without code change)
- Socket events (namespaced, easy to add new event types)
- AI service (prompt is separate from service — easy to update detection patterns)

---

## COSTING — COMPLETE BREAKDOWN

### One-Time Setup Costs (Before You Write a Line of Code)

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | ₹8,100 / $99/year | Required for TestFlight + App Store |
| Google Play Developer | ₹1,600 / $25 one-time | Required for Play Store — pay once forever |
| Domain name (.app or .com) | ₹800–₹1,500 / $10–$18/year | e.g. manter.app on Google Domains or Namecheap |
| SSL Certificate | Free | Let's Encrypt (auto via hosting platforms) or included with most hosts |
| Figma (design tool) | Free tier | Sufficient for v1 UI mockups |
| **Total One-Time** | **~₹11,500 / ~$142** | |

---

### Infrastructure Costs — 3 Hosting Options

---

#### OPTION A: Railway (Recommended for v1 Launch)

Railway is the fastest way to deploy. You push to GitHub and it deploys automatically. No server management.

**Step-by-step setup:**
```
1. Go to railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo → select your server/ folder
3. Add Plugin → PostgreSQL → Railway creates a managed DB, gives you DATABASE_URL
4. Add Plugin → Redis → Railway creates a managed Redis, gives you REDIS_URL
5. Go to Variables → paste all your .env values
6. Railway assigns a public URL (e.g. manter-server.railway.app)
7. Set custom domain: api.manter.app → point DNS to Railway
```

| Resource | Railway Plan | Monthly Cost (INR) | Monthly Cost (USD) |
|---|---|---|---|
| Node.js Server | Starter ($5 credit free, then usage-based) | ₹0–₹830 | $0–$10 |
| PostgreSQL | Starter (1GB storage) | ₹415 | $5 |
| Redis | Starter (25MB) | ₹415 | $5 |
| Bandwidth | Included in plan | ₹0 | $0 |
| **Total (Railway)** | | **₹830–₹1,660/month** | **$10–$20/month** |

**Best for:** First 0–1,000 users. Zero DevOps required.
**Limitation:** Not ideal beyond ~5,000 users (becomes expensive vs AWS).

---

#### OPTION B: DigitalOcean App Platform (Middle Ground)

More control than Railway, simpler than AWS. Good Indian pricing.

**Step-by-step setup:**
```
1. Go to digitalocean.com → Create account
2. Create App → Connect GitHub → select server/ folder
3. Add Database → Managed PostgreSQL (Basic plan, $15/month)
4. Add Cache → Managed Redis (Basic plan, $15/month)
5. App Service → Basic ($12/month, 1 vCPU, 512MB RAM)
6. Set environment variables in App settings
7. Add custom domain → point DNS to DigitalOcean
8. Deploy → automatic on every git push to main
```

| Resource | Plan | Monthly Cost (INR) | Monthly Cost (USD) |
|---|---|---|---|
| App Service (Node.js) | Basic — 1 vCPU, 512MB | ₹996 | $12 |
| Managed PostgreSQL | Basic — 1 vCPU, 1GB RAM | ₹1,245 | $15 |
| Managed Redis | Basic — 1 vCPU, 1GB RAM | ₹1,245 | $15 |
| Spaces (S3-compatible) | 250GB + 1TB transfer | ₹415 | $5 |
| **Total (DigitalOcean)** | | **₹3,901/month** | **$47/month** |

**Best for:** 1,000–10,000 users. Better reliability than Railway, still manageable.

---

#### OPTION C: AWS (Production-Grade, Recommended After 5K Users)

More complex to set up but scales to millions of users. Most control.

**Step-by-step setup:**
```
1. Create AWS account at aws.amazon.com (free tier available)
2. Create IAM user with programmatic access (never use root account)
3. Set up VPC with public + private subnets

4. EC2 (Server):
   → EC2 → Launch Instance → Ubuntu 22.04 → t3.small ($0.0208/hr)
   → Security Group: allow 80, 443, 3000, 22 (SSH)
   → Elastic IP: assign static IP
   → SSH in, install Node.js 20, pm2, nginx
   → Deploy server code, pm2 start server.js

5. RDS (PostgreSQL):
   → RDS → Create Database → PostgreSQL 16
   → db.t3.micro ($0.017/hr) → 20GB storage
   → Place in private subnet (no public access)
   → Allow only EC2 security group to connect

6. ElastiCache (Redis):
   → ElastiCache → Create → Redis 7
   → cache.t3.micro ($0.017/hr)
   → Place in private subnet

7. S3 (Photos):
   → S3 → Create bucket → manter-media-prod
   → Region: ap-south-1 (Mumbai)
   → Enable versioning, block public access
   → Create CloudFront distribution pointing to S3

8. Application Load Balancer:
   → EC2 → Load Balancers → Application
   → HTTPS listener → SSL cert from AWS Certificate Manager (free)
   → Forward to EC2 instances

9. Set environment variables on EC2 via .env file
   → Or use AWS Systems Manager Parameter Store (more secure)
```

| Resource | AWS Service | Spec | Monthly Cost (INR) | Monthly Cost (USD) |
|---|---|---|---|---|
| Server | EC2 t3.small | 2 vCPU, 2GB RAM | ₹1,245 | $15 |
| Database | RDS db.t3.micro | 1 vCPU, 1GB RAM, 20GB | ₹1,245 | $15 |
| Cache | ElastiCache cache.t3.micro | 1 vCPU, 0.5GB | ₹1,000 | $12 |
| Storage | S3 (10GB photos) | ap-south-1 | ₹200 | $2.30 |
| CDN | CloudFront (50GB transfer) | Global | ₹350 | $4.25 |
| Load Balancer | ALB | Pay per hour | ₹1,375 | $16.50 |
| **Total (AWS — v1)** | | | **₹5,415/month** | **$65/month** |

**Best for:** 5,000+ users, serious production app. Scales to any size.

---

### External Service Costs (All Options)

These costs are the same regardless of which hosting you choose.

| Service | What It Does | Cost Structure | Monthly Estimate |
|---|---|---|---|
| **Claude API** | AI red flag detection | $3 per 1M input tokens | See scale table below |
| **Persona** | Man's ID verification | $1.50–$3.00 per verification | One-time per man |
| **Twilio** | Safety check-in SMS | $0.0079/SMS (India) | ~₹40–₹80 |
| **Expo Push** | Push notifications | Free ≤ 1M/month | ₹0 |
| **Stripe** | Subscription payments | 2% + ₹2 per transaction | Revenue % |
| **Sentry** | Error monitoring | Free ≤ 5K errors/month | ₹0 |
| **Checkr** | Background checks (v2) | $25–$40 per check | v2 feature |

#### Claude API Cost at Scale

Each scan analyzes the last 20 messages (~600 tokens total):

| Daily Active Users | Scans/Day | Monthly Cost (USD) | Monthly Cost (INR) |
|---|---|---|---|
| 100 | ~500 scans | ~$1 | ~₹83 |
| 1,000 | ~5,000 scans | ~$9 | ~₹747 |
| 10,000 | ~50,000 scans | ~$90 | ~₹7,470 |
| 100,000 | ~500,000 scans | ~$900 | ~₹74,700 |

#### Persona Verification Cost

One-time cost when a man verifies his ID. Not monthly recurring:

| Men Verified | Cost (USD) | Cost (INR) |
|---|---|---|
| 100 men | $150–$300 | ₹12,450–₹24,900 |
| 1,000 men | $1,500–$3,000 | ₹1.24L–₹2.49L |
| 10,000 men | $15,000–$30,000 | ₹12.4L–₹24.9L |

Note: Pass cost to users — include it in the men's subscription pricing. At $9.99/month, 3 months of subscription covers the verification cost.

---

### Total Monthly Cost at Each Scale

| Stage | Users | Railway | DigitalOcean | AWS | Claude API | Twilio + misc | **Total/month** |
|---|---|---|---|---|---|---|---|
| **Beta** | 0–100 | ₹1,245 | — | — | ₹83 | ₹200 | **~₹1,528** |
| **Early** | 100–1K | ₹1,660 | — | — | ₹747 | ₹500 | **~₹2,907** |
| **Growth** | 1K–5K | — | ₹3,901 | — | ₹3,735 | ₹1,000 | **~₹8,636** |
| **Scale** | 5K–10K | — | — | ₹5,415 | ₹7,470 | ₹2,000 | **~₹14,885** |
| **Large** | 10K–50K | — | — | ₹16,600 | ₹37,350 | ₹5,000 | **~₹58,950** |

---

### Revenue vs Cost (Break-Even Analysis)

**Pricing:**
- Women Premium: ₹999/month (~$12)
- Men Access: ₹830/month (~$10) — required after trial

**Break-even calculation:**

| Stage | Total Users | Paying Users (est.) | Monthly Revenue | Monthly Cost | **Net Profit** |
|---|---|---|---|---|---|
| Beta | 100 | 10 paying | ₹9,150 | ₹1,528 | **+₹7,622** |
| Early | 1,000 | 200 paying | ₹1,66,000 | ₹2,907 | **+₹1,63,093** |
| Growth | 5,000 | 1,500 paying | ₹12,45,000 | ₹8,636 | **+₹12,36,364** |
| Scale | 10,000 | 4,000 paying | ₹33,20,000 | ₹14,885 | **+₹33,05,115** |

Stripe fee (2% + ₹2): subtract ~2% from revenue at scale.
Break-even is achieved at roughly **15–20 paying users** — achievable in week 1 of launch.

---

### App Store Fees

Both stores take a commission on subscriptions:

| Platform | Year 1 Commission | After Year 1 |
|---|---|---|
| Apple App Store | 30% of subscription revenue | 15% after 12 months of continuous subscription |
| Google Play Store | 15% of first $1M revenue | 15% ongoing |

**Impact on pricing:**
If you charge ₹999 on the App Store, Apple takes ₹300 (year 1) or ₹150 (year 2+).
You receive ₹699–₹849 per subscriber.

**Recommendation:** Price slightly higher to absorb store fees — ₹1,099 on App Store, ₹999 on your website (if you add web payments via Stripe directly, 0% store fee).

---

## HOSTING — STEP BY STEP SETUP GUIDE

### Recommended Path: Railway → DigitalOcean → AWS

```
Launch (0–1K users)     → Railway       (1 day to deploy, ~₹1,660/month)
Growth (1K–5K users)    → DigitalOcean  (migrate in a weekend, ~₹3,901/month)
Scale (5K+ users)       → AWS           (migrate with zero downtime, ~₹5,415+/month)
```

---

### STAGE 1: Deploy on Railway (v1 Launch)

**Prerequisites:** GitHub account, Railway account, all .env values ready

```bash
# Step 1: Push server code to GitHub
cd /Users/raj/Projects/Manter/server
git init
git add .
git commit -m "initial server"
git remote add origin https://github.com/yourusername/manter-server
git push -u origin main

# Step 2: Go to railway.app → New Project → Deploy from GitHub
# Select your manter-server repo
# Railway detects Node.js and deploys automatically

# Step 3: Add PostgreSQL
# Railway Dashboard → + New → Database → PostgreSQL
# Copy DATABASE_URL from the Variables tab

# Step 4: Add Redis
# Railway Dashboard → + New → Database → Redis
# Copy REDIS_URL from the Variables tab

# Step 5: Set all environment variables
# Railway Dashboard → your server service → Variables → paste all .env values

# Step 6: Run migrations
# Railway Dashboard → your server service → Shell tab
npx knex migrate:latest
npx knex seed:run
# Verify: "23 qualities seeded" in output

# Step 7: Get your public URL
# Railway Dashboard → Settings → Domains
# Add custom domain: api.manter.app
# Update your DNS: CNAME api → your-project.railway.app

# Step 8: Test
curl https://api.manter.app/health
# Should return: { "status": "ok", "db": "connected", "redis": "connected" }
```

**Total time to deploy:** 30–60 minutes.

---

### STAGE 2: Migrate to DigitalOcean (When You Hit 1K Users)

**Prerequisites:** DigitalOcean account, existing Railway DB with data

```bash
# Step 1: Export data from Railway PostgreSQL
# Railway → your postgres → Connect → use connection string
pg_dump -Fc "$RAILWAY_DATABASE_URL" > manter_backup.dump

# Step 2: Create DigitalOcean Managed PostgreSQL
# DigitalOcean → Databases → Create → PostgreSQL 16 → Basic ($15/month)
# Wait ~5 minutes for provisioning

# Step 3: Restore data to DigitalOcean
pg_restore -d "$DO_DATABASE_URL" manter_backup.dump

# Step 4: Create DigitalOcean Managed Redis
# DigitalOcean → Databases → Create → Redis → Basic ($15/month)

# Step 5: Create App Platform service
# DigitalOcean → Apps → Create App → GitHub → manter-server
# Set Run Command: node dist/server.js
# Set Build Command: npm run build
# Set all environment variables (update DATABASE_URL and REDIS_URL to new ones)

# Step 6: Zero-downtime cutover
# Update DNS: api.manter.app → DigitalOcean app URL
# Old Railway URL still works during DNS propagation (5–30 min)
# Disable Railway service after DNS propagates

# Step 7: Verify
curl https://api.manter.app/health
# Monitor DigitalOcean dashboard for errors in first hour
```

---

### STAGE 3: Migrate to AWS (When You Hit 5K Users)

This is a full production setup with high availability.

#### 3A — AWS Account Setup
```bash
# 1. Create AWS account → aws.amazon.com
# 2. Enable MFA on root account immediately
# 3. Create IAM user "manter-admin"
#    → Attach policy: AdministratorAccess (for now — restrict later)
#    → Download access keys
# 4. Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Key, Region (ap-south-1), Output format (json)
```

#### 3B — VPC and Networking
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications \
  'ResourceType=vpc,Tags=[{Key=Name,Value=manter-vpc}]'

# Create public subnet (for EC2 + Load Balancer)
aws ec2 create-subnet --vpc-id vpc-xxx \
  --cidr-block 10.0.1.0/24 --availability-zone ap-south-1a

# Create private subnet (for RDS + Redis — no internet access)
aws ec2 create-subnet --vpc-id vpc-xxx \
  --cidr-block 10.0.2.0/24 --availability-zone ap-south-1a

# Create Internet Gateway and attach to VPC
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx

# Create route table for public subnet
aws ec2 create-route-table --vpc-id vpc-xxx
aws ec2 create-route --route-table-id rtb-xxx \
  --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxx
```

#### 3C — RDS (PostgreSQL)
```bash
# Create DB subnet group (spans 2 AZs for high availability)
aws rds create-db-subnet-group \
  --db-subnet-group-name manter-db-subnets \
  --db-subnet-group-description "Manter DB subnets" \
  --subnet-ids subnet-xxx subnet-yyy

# Create PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier manter-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username manter \
  --master-user-password "YourStrongPassword" \
  --allocated-storage 20 \
  --db-name manter \
  --db-subnet-group-name manter-db-subnets \
  --no-publicly-accessible

# Takes ~5 minutes. Get endpoint:
aws rds describe-db-instances \
  --query 'DBInstances[0].Endpoint.Address'
```

#### 3D — ElastiCache (Redis)
```bash
# Create Redis cluster
aws elasticache create-replication-group \
  --replication-group-id manter-redis \
  --replication-group-description "Manter Redis" \
  --node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-clusters 1 \
  --subnet-group-name manter-cache-subnets

# Get endpoint:
aws elasticache describe-replication-groups \
  --replication-group-id manter-redis \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint'
```

#### 3E — S3 Bucket (Photos)
```bash
# Create bucket
aws s3api create-bucket \
  --bucket manter-media-prod \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Block all public access (photos served via CloudFront, not S3 directly)
aws s3api put-public-access-block \
  --bucket manter-media-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create CloudFront distribution pointing to S3
# → AWS Console → CloudFront → Create Distribution
# → Origin: manter-media-prod.s3.ap-south-1.amazonaws.com
# → Origin Access Control (OAC) — so S3 accepts only CloudFront requests
# → Default TTL: 86400 (1 day)
# → CNAME: media.manter.app
# → SSL: Request certificate from ACM
```

#### 3F — EC2 Server
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0287a05f0ef0e9d9a \  # Ubuntu 22.04 in ap-south-1
  --instance-type t3.small \
  --key-name manter-key \
  --security-group-ids sg-xxx \
  --subnet-id subnet-xxx \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=manter-server-1}]'

# SSH into EC2
ssh -i manter-key.pem ubuntu@<EC2-PUBLIC-IP>

# Install Node.js 20 + PM2 + Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2

# Clone and build server
git clone https://github.com/yourusername/manter-server.git
cd manter-server
npm install
npm run build

# Create .env with all production values
nano .env
# Paste all environment variables

# Run migrations against production RDS
npx knex migrate:latest
npx knex seed:run

# Start with PM2 (auto-restart on crash, restart on reboot)
pm2 start dist/server.js --name manter-server
pm2 startup    # generates command to run on system boot
pm2 save       # saves process list

# Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/manter
```

```nginx
# /etc/nginx/sites-available/manter
server {
    listen 80;
    server_name api.manter.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';   # required for Socket.io
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/manter /etc/nginx/sites-enabled/
sudo nginx -t   # test config
sudo systemctl restart nginx

# Install SSL certificate
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.manter.app
# Certbot auto-renews every 90 days
```

#### 3G — DNS Setup (All Platforms)
```
In your domain registrar (Namecheap, GoDaddy, Cloudflare):

Record Type  |  Name          |  Value
─────────────────────────────────────────────────────
CNAME        |  api           |  your-server.railway.app     (Railway)
                              |  your-app.ondigitalocean.com (DigitalOcean)
                              |  your-load-balancer.ap-south-1.elb.amazonaws.com (AWS)
CNAME        |  media         |  xxxxx.cloudfront.net        (CloudFront CDN)
A            |  @             |  your-landing-page-IP
```

---

### STAGE 4: Expo Build + App Store Submission

```bash
# Step 1: Install EAS CLI
npm install -g eas-cli
eas login   # log in to your Expo account

# Step 2: Configure EAS in client/
cd /Users/raj/Projects/Manter/client
eas build:configure
# This creates eas.json

# Step 3: Update app.json with your app details
# bundleIdentifier: com.yourname.manter (iOS)
# package: com.yourname.manter (Android)

# Step 4: Build for iOS (TestFlight first)
eas build --platform ios --profile preview
# Takes 10–20 minutes on Expo's cloud servers
# Downloads .ipa file when done

# Step 5: Submit to TestFlight
eas submit --platform ios
# Follow prompts — needs Apple ID with Developer Program access
# TestFlight review: usually approved in 1–2 days

# Step 6: Build for Android (Play Store Internal Testing)
eas build --platform android --profile preview
# Takes 5–10 minutes
# Downloads .aab file when done

# Step 7: Submit to Play Store
eas submit --platform android
# Needs Google Play service account key (create in Play Console)
# Internal testing available immediately after upload

# Step 8: Production builds (after testing)
eas build --platform all --profile production
eas submit --platform all
```

**App Store review timeline:**
- iOS App Store: 1–3 days (first submission), 1 day (updates)
- Google Play Store: 1–3 days (first submission), same day (updates to approved app)

**Before submitting to App Store — checklist:**
```
□ Privacy Policy URL added in App Store Connect
□ Terms of Service URL added
□ Age rating filled: 17+ (dating app)
□ Data collection disclosure: email, photos, location (city only)
□ App screenshots created for:
    - iPhone 6.7" (1290×2796px) — 3 minimum
    - iPad 12.9" (2048×2732px) — required for iPad
    - Android phone (1080×1920px)
□ App description written (4000 chars max)
□ Keywords set (ASO — App Store Optimization)
□ Support URL and email set
□ Review notes for Apple: "This app requires role selection.
  To test the woman experience, select 'I am a woman' on the role screen.
  Test account: test-woman@manter.app / TestPass123!"
```

---

### QUICK REFERENCE — Cost Summary Card

```
┌──────────────────────────────────────────────────────────┐
│                  MANTER COST SUMMARY                     │
├──────────────────────────────────────────────────────────┤
│  SETUP (one-time)                                        │
│  Apple Developer Program        ₹8,100 / year            │
│  Google Play                    ₹1,600 (once)            │
│  Domain (.app or .com)          ₹1,200 / year            │
│  ──────────────────────────────────────────────────────  │
│  Total setup                    ~₹10,900                 │
├──────────────────────────────────────────────────────────┤
│  MONTHLY INFRASTRUCTURE                                  │
│  Beta (Railway, 0–1K users)     ₹1,660/month             │
│  Growth (DigitalOcean, 1–5K)    ₹3,901/month             │
│  Scale (AWS, 5K–10K)            ₹5,415/month             │
├──────────────────────────────────────────────────────────┤
│  VARIABLE COSTS (per scale)                              │
│  Claude API (10K users)         ₹7,470/month             │
│  Twilio SMS                     ₹80–₹400/month           │
│  Persona ID verify              ₹125/man (one-time)      │
│  Stripe fees                    2% of revenue            │
│  App Store cut                  15–30% of subscriptions  │
├──────────────────────────────────────────────────────────┤
│  REVENUE POTENTIAL                                       │
│  Women Premium (₹999/month)                              │
│  Men Access (₹830/month)                                 │
│  Break-even: ~15 paying users                            │
│  At 1,000 paying users: ~₹9.15L/month revenue           │
│  At 10,000 paying users: ~₹91.5L/month revenue          │
└──────────────────────────────────────────────────────────┘
```
