# Charms

> Safety-first dating for everyone — male, female, and LGBTQ+. Match on **verified character** across 23 qualities — not photos.
> A mobile-first **PWA** (installable from the browser, no app-store fees) on **Next.js + Supabase + FastAPI**.

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the full phased plan, data model, design system, and cost breakdown.

## Stack

| Part | Tech | Where it runs |
|---|---|---|
| `client/` | Next.js 15 · TypeScript · Tailwind v4 · PWA | Vercel (free) |
| Supabase | Postgres · Auth · Storage · Realtime · RLS | Supabase (free) |
| `server/` | FastAPI · Claude Haiku red-flag scan | Render/Fly (free) |

## What's built

- **Onboarding** — pick a gender (male / female / LGBTQ+), who you're interested in, fill a profile, take the quiz, set your priorities.
- **Situational character quiz** — every profile answers the same 14 real-incident-grounded questions on a 5-point agree/disagree scale (consent & entitlement scenarios inspired by the viral ₹370 biryani story, plus LGBTQ+-specific situations like workplace/family discrimination and outing without consent). Scored deterministically per quality (1–5, with a short reason) — same mechanic for everyone, no AI call needed.
- **Swipe discovery** — every profile browses compatible candidates ranked by a weighted match score (your 1–5 priority per quality × their quiz score), filtered by mutual `interested_in`.
- **Realtime chat** — matched users message over Supabase Realtime, with a **Claude Haiku red-flag scan** on incoming messages, surfaced to whoever received them.
- **Editable profiles + photos** — every profile can edit their details and upload up to **3 photos** (private Storage bucket). Any signed-in user can browse any other profile's photos — Discover is open browsing by design.
- **Verification badges** — profiles carry an `unverified / pending / verified / rejected` state.

## Getting started

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run, in order:
   - `supabase/schema.sql` (tables, RLS, helpers)
   - `supabase/seed.sql` (the 23 qualities)
   - each file in `supabase/migrations/` in numeric order (`0001` → `0013`)
3. Copy the Project URL + anon key (Settings → API).

> `supabase/migrations/0006_profile_photos.sql` creates the private
> `profile-photos` Storage bucket and its RLS (fresh installs get it from
> `schema.sql`). Photo reads are open to any signed-in user, same as profiles.

> `supabase/migrations/0013_gender_symmetric_model.sql` is the big one: it
> replaces the old binary woman/man model with three genders (male/female/
> lgbtq), generic `priority_weights`/`quiz_scores`/`quiz_answers` tables used
> by every profile, and `matches.seeker_id`/`target_id` in place of
> `woman_id`/`man_id`. Run it after `0001`–`0012` on existing databases.

> `supabase/migrations/0005_named_views.sql` (superseded by `0013` for the
> per-gender views) adds read-only `*_named` views (`matches_named`,
> `messages_named`, `priority_weights_named`, …) that join in display names so
> you can read the data in the dashboard without chasing UUIDs.

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

Endpoints: `/health`, plus the `ai` (red-flag scan) router.

## Seed demo profiles & logins

`server/scripts/seed_profiles.py` creates demo profiles directly in Supabase
Auth (via the service-role key) across all three genders, each with a profile
row plus the same gender-symmetric data every profile gets (`priority_weights`,
`quiz_scores`, `quiz_answers`). Names, ages, cities and bios are generated with
Faker; the 23 quality keys are read from the `qualities` table, so run
`supabase/seed.sql` first.

```bash
cd server && source .venv/bin/activate
pip install -r requirements-dev.txt          # Faker, etc.

python scripts/seed_profiles.py                          # 4 of each gender (default)
python scripts/seed_profiles.py --male 3 --female 3 --lgbtq 6
python scripts/seed_profiles.py --clean                  # delete prior seed users, then reseed
```

**Logins** — emails are **deterministic** so you can sign in without reading the
script output: `male1`, `male2`, …, `female1`, `female2`, …, `lgbtq1`, `lgbtq2`, …
each at `@seed.charms.test`. Every account shares one password.

| Email | Password |
|---|---|
| `male1@seed.charms.test` | `CharmsSeed!23` |
| `female1@seed.charms.test` | `CharmsSeed!23` |
| `lgbtq1@seed.charms.test` | `CharmsSeed!23` |
| … | … |

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
