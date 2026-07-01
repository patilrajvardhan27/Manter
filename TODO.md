# TODO

Tracking the security/feature gaps identified in a review of what's built
vs. what `points.txt` calls for. Update this file as items are picked up.

## Done

- [x] **`/scan` endpoint auth** — required an unauthenticated caller to be
  a participant in the message's match, and forbid scanning your own
  message (mirrors the `red_flags: recipient reads` RLS policy).
  `server/app/routers/ai.py`
- [x] **Red-flag scans now persist** — previously a scan result only lived
  in React state (`Chat.tsx`) and vanished on refresh; `red_flags` rows
  are now written by the FastAPI service after every scan.
  `messages.scanned` (migration `0014`) makes this idempotent per
  message so a re-fetch/reconnect doesn't re-bill Anthropic.

## Remaining

- [ ] **Date safety check-in + emergency contacts** — `emergency_contacts`
  table already exists in `schema.sql`, but there's no client code
  touching it at all. `points.txt` #39 calls this one of the
  highest-rated safety features in the category (timed check-in that
  alerts an emergency contact if not confirmed safe).
- [ ] **ID verification** — `profiles.verification` is just a status enum
  someone has to flip manually; there's no upload/review flow behind
  the "verified" badge, so it's decorative today. `points.txt` #35.
- [ ] **Report / block** — mentioned in Safety/Terms copy but there's no
  reporting or blocking mechanism in the schema or client yet.

## Noted but not scheduled

- No automated test suite anywhere in the repo (client or server).
- `/scan` has no per-user rate limit beyond "must be a real authenticated
  participant in a real match" — fine for now, but worth adding if
  cost/abuse becomes a real concern.
- There's leftover data in Supabase from an older seed run under the
  `@seed.manter.test` domain (pre-dates the `seed.charms.test` seed
  script) — orphaned auth users/matches not cleaned up by
  `seed_profiles.py --clean` since it only targets its own domain.
