# TODO

Tracking the security/feature gaps identified in a review of what's built
vs. what `points.txt` calls for. Update this file as items are picked up.

## Done

- [x] **`/scan` endpoint auth**: required an unauthenticated caller to be
  a participant in the message's match, and forbid scanning your own
  message (mirrors the `red_flags: recipient reads` RLS policy).
  `server/app/routers/ai.py`
- [x] **Red-flag scans now persist**: previously a scan result only lived
  in React state (`Chat.tsx`) and vanished on refresh; `red_flags` rows
  are now written by the FastAPI service after every scan.
  `messages.scanned` (migration `0014`) makes this idempotent per
  message so a re-fetch/reconnect doesn't re-bill the model API.

- [x] **Known-style introductions**: reciprocal scoring, one intro per
  person per round, mutual opt-in via RPC + trigger, 24h expiry, pair
  introduced at most once, post-match feedback, learned preference
  offsets. Migration `0016`.
- [x] **Consent before chat**: matches (and chats) from introductions only
  exist once both sides say interested.
- [x] **Tests**: 24 pytest tests for the matcher and Python/TypeScript
  constant drift. Offline eval in
  `server/scripts/eval_matchmaker.py`.
- [x] **`schema.sql` ran on a fresh database**: the "weights: matched
  counterpart reads" policy referenced `matches` before it existed.
- [x] **Red-flag prompt** still said "a man sent a woman" after the
  gender-symmetric rewrite.

- [x] **Voice interview removed**: client page, FastAPI routes and the
  interviewer are gone. The `voice_*` tables and the voice term in the
  `character_scores` view are still in the database, unused.
- [x] **Chat write hardening** (migration `0017`): 2,000-character limit,
  senders can no longer set `scanned`/`created_at`, and the match update
  policy that let a participant repoint a thread is dropped.
- [x] **Discover reads scores in batches**, so it no longer truncates at
  Supabase's 1,000-row cap.

## Remaining

- [ ] **Date safety check-in + emergency contacts**: `emergency_contacts`
  table already exists in `schema.sql`, but there's no client code
  touching it at all. `points.txt` #39 calls this one of the
  highest-rated safety features in the category (timed check-in that
  alerts an emergency contact if not confirmed safe).
- [ ] **ID verification**: `profiles.verification` is just a status enum
  someone has to flip manually; there's no upload/review flow behind
  the "verified" badge, so it's decorative today. `points.txt` #35.
- [ ] **Report / block**: mentioned in Safety/Terms copy but there's no
  reporting or blocking mechanism in the schema or client yet.

- [ ] **Make Discover two-sided**: it is back in the nav, and its "like"
  still opens a chat without the other person agreeing. Only the person
  who started a chat can unmatch, so the recipient has no way to leave.
- [ ] **Date planning**: shared availability and a venue near both people,
  chat opening the morning of the date (Known's flow).
- [ ] **Calibrate the matcher on real outcomes**: replace the heuristic
  edge weight with a fitted P(mutual yes | pair), re-pick
  `INTRO_MIN_SCORE`, and A/B the learned offsets before trusting them (the
  sim showed no gain).
- [ ] **Schedule matchmaker rounds** in production (cron hitting
  `POST /matchmaker/run`).

## Noted but not scheduled

- No client test suite yet. Server has pytest.
- `/scan` has no per-user rate limit beyond "must be a real authenticated
  participant in a real match", which is fine for now, but worth adding if
  cost/abuse becomes a real concern.
- There's leftover data in Supabase from an older seed run under the
  `@seed.manter.test` domain (pre-dates the `seed.charms.test` seed
  script): orphaned auth users/matches not cleaned up by
  `seed_profiles.py --clean` since it only targets its own domain.
