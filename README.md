# Manter

> Safety-first dating for women. Match on **verified character** across 23 qualities — not photos.
> A mobile-first **PWA** (installable from the browser, no app-store fees) on **Next.js + Supabase + FastAPI**.

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the full phased plan, data model, design system, and cost breakdown.

## Stack

| Part | Tech | Where it runs |
|---|---|---|
| `client/` | Next.js 15 · TypeScript · Tailwind v4 · PWA | Vercel (free) |
| Supabase | Postgres · Auth · Storage · Realtime · RLS | Supabase (free) |
| `server/` | FastAPI · Claude Haiku · scoring engine | Render/Fly (free) |

## What's built

- **Onboarding** — pick a role (woman/man), fill a profile, take the quiz.
- **Behavioral quiz** — women author questions; men answer in **free text**, which **Claude scores** (1–5 per quality) instead of multiple choice. Six default questions ship in app code; women can add their own.
- **Swipe discovery** — women browse compatible men ranked by a weighted match score (her 1–5 priority per quality × his quiz scores).
- **Realtime chat** — matched users message over Supabase Realtime, with a **Claude Haiku red-flag scan** on incoming messages.
- **Verification badges** — profiles carry an `unverified / pending / verified / rejected` state.

## Getting started

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run, in order:
   - `supabase/schema.sql` (tables, RLS, helpers)
   - `supabase/seed.sql` (the 23 qualities)
   - each file in `supabase/migrations/` in numeric order (`0001` → `0005`)
3. Copy the Project URL + anon key (Settings → API).

> `supabase/migrations/0005_named_views.sql` adds read-only `*_named` views
> (`matches_named`, `messages_named`, `woman_weights_named`, …) that join in
> display names so you can read the data in the dashboard without chasing UUIDs.

### 2. Client (Next.js)
```bash
cd client
cp .env.example .env.local   # fill in Supabase URL + anon key + FastAPI URL
pnpm install
pnpm dev                     # http://localhost:3000
```

### 3. Server (FastAPI)
```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # fill in service-role key + ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/health
```

Endpoints: `/health`, plus the `scoring`, `ai` (red-flag scan), and `quiz` (Claude scoring) routers.

## Seed demo profiles & logins

`server/scripts/seed_profiles.py` creates demo women and men directly in Supabase
Auth (via the service-role key), each with a profile row plus role-specific data
(women → `woman_weights`, men → `man_quiz_scores`). Names, ages, cities and bios
are generated with Faker; the 23 quality keys are read from the `qualities` table,
so run `supabase/seed.sql` first.

```bash
cd server && source .venv/bin/activate
pip install -r requirements-dev.txt          # Faker, etc.

python scripts/seed_profiles.py              # 5 women + 5 men (default)
python scripts/seed_profiles.py --women 3 --men 8
python scripts/seed_profiles.py --clean      # delete prior seed users, then reseed
```

**Logins** — emails are **deterministic** so you can sign in without reading the
script output: `woman1`, `woman2`, … and `man1`, `man2`, … each at
`@seed.manter.test`. Every account shares one password.

| Email | Password |
|---|---|
| `woman1@seed.manter.test` | `ManterSeed!23` |
| `woman2@seed.manter.test` | `ManterSeed!23` |
| … | … |
| `man1@seed.manter.test` | `ManterSeed!23` |
| `man2@seed.manter.test` | `ManterSeed!23` |

(Override the password with `--password`. Display names/ages/cities/bios are still
Faker-randomized; only the login emails are stable.) The script also prints every
account it creates at the end of a run.

> Re-running without `--clean` will collide on the fixed emails — use
> `python scripts/seed_profiles.py --clean` to wipe the old seed accounts first.
> `--clean` removes exactly the accounts this script made (deleting the auth user
> cascades to its profile, weights, scores, and quiz answers).

## Project status

Phase 0 (foundations, design system, schema, FastAPI skeleton) plus the
post-login app (onboarding, quiz, discovery, chat) are built.
Remaining phases are specified in `IMPLEMENTATION_PLAN.md`.
