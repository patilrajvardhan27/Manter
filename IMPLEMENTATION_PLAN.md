# Charms — Implementation Plan

> Safety-first dating for women. Surfaces men by **verified character** across **23 qualities**, not photos.
> Built as a **mobile-first PWA** (installable from the browser — no app-store fees), on **Supabase** + **FastAPI**.

---

## 0. Guiding Principles

1. **Women-first.** Women control who reaches them. Defaults protect, not expose.
2. **Character over photos.** The 23-quality framework is the product; photos are secondary.
3. **Safety is the feature, not a checkbox.** Check-in, red-flag AI, and community warnings are core.
4. **Minimal cost (~$0–10/mo).** Free tiers only: Supabase free, Vercel free, FastAPI free tier, Claude **Haiku** for AI. **No subscriptions / payments.**
5. **Ship installable, not in stores.** PWA with `manifest` + service worker → "Add to Home Screen" on iOS/Android. Zero publishing cost.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Client — Next.js 15 PWA                     │
│  App Router · TypeScript · Tailwind v4 · mobile-first          │
│  Installable (manifest + SW) · offline shell                   │
└───────────────┬───────────────────────────────┬───────────────┘
                │ @supabase/ssr (auth, CRUD,     │ fetch (scoring,
                │ realtime, storage, RLS)        │ AI red-flag, checkin)
                ▼                                 ▼
┌───────────────────────────────┐   ┌────────────────────────────┐
│           Supabase            │   │     FastAPI (Python)        │
│  • Postgres + Row Level Sec.  │   │  • Compatibility scoring    │
│  • Auth (email + magic link)  │   │  • Claude Haiku red-flag    │
│  • Storage (photos, private)  │◄──┤    scan (server-side key)   │
│  • Realtime (chat, presence)  │   │  • Check-in scheduler       │
│  • Edge cron (check-in fire)  │   │  • Service-role DB writes   │
└───────────────────────────────┘   └─────────────┬──────────────┘
                                                   │ Anthropic API
                                                   ▼  claude-haiku-4-5
                                          ┌──────────────────┐
                                          │   Claude (AI)    │
                                          └──────────────────┘
```

**Why two backends?** Supabase removes 80% of backend work (auth, CRUD, realtime, storage) with RLS for security. FastAPI exists only where we need a trusted server: hiding the Anthropic key, running the scoring math, and orchestrating timed safety check-ins. The client never holds a secret.

### Repository layout
```
Charms/
├── IMPLEMENTATION_PLAN.md        ← this file
├── README.md                     ← run instructions
├── client/                       ← Next.js 15 PWA
│   ├── src/app/                  ← App Router routes
│   ├── src/components/           ← UI + feature components
│   ├── src/lib/supabase/         ← browser + server clients
│   ├── src/lib/constants/        ← 23 qualities, quiz, red flags
│   └── public/manifest.webmanifest
├── server/                       ← FastAPI service
│   ├── app/main.py
│   ├── app/routers/              ← scoring, ai, checkin
│   ├── app/services/             ← scoring engine, claude client
│   └── requirements.txt
└── supabase/
    ├── schema.sql                ← tables + RLS + functions
    └── seed.sql                  ← 23 qualities + quiz seed
```

---

## 2. Tech Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript | One framework, RSC for fast mobile loads, free on Vercel |
| Styling | Tailwind v4 (`@theme` tokens) | Design tokens in CSS, no runtime cost |
| Install | PWA (manifest + service worker) | Installable phone app, **no store fees** |
| DB / Auth / Realtime / Storage | Supabase | Free tier covers MVP; RLS = security without backend code |
| AI / scoring | FastAPI (Python) | Trusted server for Anthropic key + scoring math + cron |
| AI model | Claude **Haiku** (`claude-haiku-4-5-20251001`) | Cheapest model that handles red-flag classification well |
| Fonts | Fraunces (display) + Hanken Grotesk (body) | Warm, editorial, distinctive — not generic |
| Deploy | Vercel (client) + Render/Fly free (FastAPI) | $0 at launch |

---

## 3. Design System

### Concept — "Warm Editorial"
A literary, sanctuary feel: cream paper, deep aubergine ink, a characterful serif. Trustworthy and human, the opposite of neon hookup-app energy.

### Color tokens
| Token | Hex | Use |
|---|---|---|
| `--cream` | `#FAF5EF` | App background (warm paper) |
| `--ink` | `#241019` | Primary text (deep aubergine-black) |
| `--plum` | `#7A2E55` | Brand / primary actions |
| `--plum-deep` | `#5C1F40` | Pressed / headings |
| `--clay` | `#D9694A` | Warm accent / highlights |
| `--sage` | `#5E8B6A` | **Green flags** / success |
| `--gold` | `#C2913F` | Verified / quality badges |
| `--red-flag` | `#B23A2E` | **Red flags** / danger (serious, not alarmist) |
| `--rose` | `#E8C4C0` | Soft surfaces / chips |
| `--paper-2` | `#F2E9DF` | Cards / raised surfaces |

> Rule: red is **reserved** for genuine safety signals so it never loses meaning. Routine destructive actions use plum, not red.

### Typography
- **Display:** Fraunces (variable, soft serif) — headings, hero, scores.
- **Body / UI:** Hanken Grotesk — readable at mobile sizes.
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 56. Body 16px min on mobile.

### Layout & motion
- **Mobile-first:** max content width 480px, bottom tab bar, thumb-reachable primary actions.
- Generous negative space; cards with soft 16–20px radii and low, warm shadows.
- Motion: one orchestrated staggered reveal on key screens; quiet micro-interactions on tap. Respect `prefers-reduced-motion`.

---

## 4. Data Model (Supabase / Postgres)

Core tables (full DDL in `supabase/schema.sql`):

- **profiles** — 1:1 with `auth.users`. `role` (`woman` | `man`), display name, age, bio, city, `photos[]`, `verification_status`.
- **qualities** — the 23 (+ research) qualities, seeded reference data.
- **woman_weights** — `(woman_id, quality_id, weight 1–5)`. Her priorities.
- **quiz_questions / quiz_options** — behavioral scenarios for men; options map to quality deltas (no obvious "right" answer).
- **man_quiz_scores** — derived per-quality self-assessment score from quiz.
- **ratings** — `(rater_woman_id, rated_man_id, quality_id, score 1–5)`, one set per dated man. Powers community score.
- **man_community_scores** (view/materialized) — average rating per quality + count.
- **matches** — `(woman_id, man_id, status)`: `pending` / `matched` / `passed` / `blocked`. Woman initiates contact.
- **messages** — `(match_id, sender_id, body, created_at)`. Realtime.
- **red_flags** — `(message_id, category, severity, rationale)` from AI scan.
- **emergency_contacts** — `(woman_id, name, email, phone)`.
- **checkins** — `(woman_id, match_id, scheduled_at, status, last_known_location)`; fires alerts if unconfirmed.
- **reports / blocks** — moderation.

### Security model (RLS)
- Every table RLS-enabled; default deny.
- A user reads/writes only their own rows; men can read women's weights **never**; women see a man's **aggregate** scores, not individual raters.
- Messages readable only by the two match participants.
- FastAPI uses the **service-role key** for trusted writes (red flags, scores, check-in fires) — never shipped to the client.

---

## 5. The 23-Quality Framework (the differentiator)

- **Women** rank which qualities matter most → weights (1–5).
- **Men** complete a behavioral quiz (scenario questions, no obvious correct answer) → a self-assessment baseline per quality.
- **Community** ratings from women who dated him → the trusted score that grows over time.
- A man's shown score per quality = blend that **down-weights self-assessment as community ratings accumulate** (`w_community = n/(n+k)`), so reputation overtakes self-report.

---

## 6. Compatibility Scoring (FastAPI)

```
compatibility(woman, man) =
   Σ_q  weight[q] * man_quality_score[q]
   ───────────────────────────────────── × 100
            Σ_q  weight[q] * 5
```
- `man_quality_score[q]` ∈ [1,5] is the blended (quiz + community) score.
- Returns 0–100 plus the **top 3 contributing qualities** and **lowest matches** so the woman knows *why* she's seeing him (research point 43: explained matches outperform blind swipes).
- Endpoint: `POST /score` → `{ score, breakdown[], strengths[], gaps[] }`.

---

## 7. Phase-by-Phase Plan

> Each phase is independently shippable and demoable.

### Phase 0 — Foundations & Design System  ✅ scaffolded
- Next.js 15 + Tailwind v4 project, design tokens, fonts, PWA manifest.
- FastAPI skeleton + healthcheck. Supabase schema + seed.
- **Done when:** `pnpm dev` shows the branded landing page; `/health` returns ok; schema applies cleanly.

### Phase 1 — Auth & Onboarding
- Supabase email/password + magic link. Role gate (`woman` / `man`).
- Onboarding flow: role → profile (name, age, city, bio, photos to Storage) → next step by role.
- **Done when:** a user signs up, picks a role, completes a profile row with RLS enforced.

### Phase 2 — 23-Quality Setup
- Women: weight-setting UI (rank/slider the 23 qualities).
- Men: behavioral quiz UI → compute `man_quiz_scores`.
- **Done when:** weights and quiz scores persist and are visible in profile.

### Phase 3 — Compatibility Scoring Engine
- FastAPI `/score`; client renders compatibility % + "why you're seeing him" breakdown.
- **Done when:** a woman sees ranked candidates with explained scores.

### Phase 4 — Curated Discovery Feed
- Ranked candidate cards (not endless swipe): score, top qualities, verification, community count.
- Filters: verified-only, min score, distance, age. Pass / save / request-contact.
- **Done when:** feed is ranked by compatibility and filterable.

### Phase 5 — Matching & Realtime Chat
- Woman initiates contact (women-first). On accept → match.
- Supabase Realtime chat + presence; message persistence; per-match thread list.
- **Done when:** two accounts can chat in real time.

### Phase 6 — AI Red-Flag Detection
- On each inbound message, FastAPI `/scan` calls Claude Haiku → classifies 7 categories
  (controlling language, anger escalation, guilt-tripping, rushing intimacy, dismissiveness, jealousy/possessiveness, social misogyny — points 28–34).
- Non-alarmist banner with **why it matters** (point 38). Stored in `red_flags`.
- **Done when:** a manipulative test message raises an explained flag.

### Phase 7 — Community Ratings & Reputation
- Women rate men they've dated across the 23 qualities (anonymous to the man).
- Aggregate community score feeds scoring (Phase 6 §6 blend). Abuse guards: one rating set per pair, report path.
- **Done when:** ratings update a man's community score and his compatibility for others.

### Phase 8 — Safety Suite
- Emergency contacts. **Date check-in:** schedule a timer; if unconfirmed, FastAPI/cron emails contacts with last-known location (email = free, no paid SMS).
- Panic action; block/report; **app lock** via WebAuthn / device passcode (PWA-friendly biometric).
- **Done when:** an unconfirmed check-in fires an email alert.

### Phase 9 — Verification & Trust
- Selfie + ID upload to private Storage; manual/assisted review → `verified` badge.
- Photo moderation hook. Verified-only filter becomes meaningful.
- **Done when:** verification status gates the verified badge and filter.

### Phase 10 — PWA Polish, Deploy & Observability
- Service worker (offline shell, install prompt), Lighthouse PWA pass, a11y, reduced-motion.
- Deploy: Vercel (client) + Render/Fly (FastAPI) + Supabase prod project. Basic logging/Sentry free tier.
- **Done when:** installable on a phone, all flows work against prod.

---

## 8. Security & Privacy

- RLS default-deny on every table; participants-only message access.
- Anthropic + service-role keys live only in FastAPI env, never client.
- Private Storage buckets for ID/photos with signed URLs.
- Anonymized community ratings; rate-limiting on AI + rating endpoints.
- Data-minimization: store only what safety/matching needs.

---

## 9. Cost (launch)

| Service | Tier | Est. |
|---|---|---|
| Supabase | Free | $0 |
| Vercel (client) | Hobby | $0 |
| FastAPI host (Render/Fly) | Free | $0 |
| Claude Haiku | pay-per-use | ~$1–5/mo at low volume |
| Email (Resend/Supabase) | Free tier | $0 |
| **Total** | | **~$0–5/mo** |

No SMS (email fallback), no paid auth, Haiku for cheapest AI — per the minimal-cost constraint.

---

## 10. Environment Variables

**client/.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```
**server/.env**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
ALLOWED_ORIGINS=http://localhost:3000
```
