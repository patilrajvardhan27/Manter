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

## Getting started

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql` then `supabase/seed.sql`.
3. Copy the Project URL + anon key (Settings → API).

### 2. Client (Next.js)
```bash
cd client
cp .env.example .env.local   # fill in Supabase URL + anon key
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

## Project status

Phase 0 (foundations, design system, schema, FastAPI skeleton) is scaffolded.
Phases 1–10 are specified in `IMPLEMENTATION_PLAN.md`.
