-- Voice matchmaker: transcripts, per-quality scores from the interview, and
-- a fused character score that blends quiz and voice evidence by confidence.
-- Safe to re-run. Apply via Supabase Dashboard -> SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. How much evidence each quiz score rests on: the number of scenarios that
--    touched that quality. 0 means it sat at the neutral default (14 of the
--    23 qualities do, because the quiz never asks about them).
-- ---------------------------------------------------------------------------
alter table quiz_scores add column if not exists evidence_n int not null default 1
  check (evidence_n >= 0);
-- Backfill: an exact 3 is indistinguishable from the untouched default.
update quiz_scores set evidence_n = 0 where score = 3;

-- ---------------------------------------------------------------------------
-- 2. Interview sessions and turns. Written only by the FastAPI service
--    (service role). Private to the owner, who can delete them.
-- ---------------------------------------------------------------------------
create table if not exists voice_sessions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  status      text not null default 'active' check (status in ('active', 'finished')),
  turn_count  int not null default 0,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists voice_sessions_profile_created on voice_sessions (profile_id, created_at desc);

alter table voice_sessions enable row level security;
drop policy if exists "voice_sessions: owner reads" on voice_sessions;
create policy "voice_sessions: owner reads" on voice_sessions
  for select using (auth.uid() = profile_id);
drop policy if exists "voice_sessions: owner deletes" on voice_sessions;
create policy "voice_sessions: owner deletes" on voice_sessions
  for delete using (auth.uid() = profile_id);

create table if not exists voice_turns (
  session_id uuid not null references voice_sessions(id) on delete cascade,
  idx        int not null,
  role       text not null check (role in ('agent', 'user')),
  text       text not null,
  target     text,  -- what the agent was probing (quality key, partner_preferences, wrap_up)
  created_at timestamptz not null default now(),
  primary key (session_id, idx)
);

alter table voice_turns enable row level security;
drop policy if exists "voice_turns: owner reads" on voice_turns;
create policy "voice_turns: owner reads" on voice_turns
  for select using (
    exists (select 1 from voice_sessions s where s.id = session_id and s.profile_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. What the interview showed. Scores have the same visibility as
--    quiz_scores (any signed-in user), because they feed the public
--    character score. Evidence, summary, priorities and dealbreakers stay
--    private to the owner (and the service role, for matching).
-- ---------------------------------------------------------------------------
create table if not exists voice_trait_scores (
  profile_id  uuid references profiles(id) on delete cascade,
  quality_key text references qualities(key) on delete cascade,
  score       numeric(3,2) not null check (score between 1 and 5),
  confidence  numeric(3,2) not null check (confidence > 0 and confidence <= 1),
  primary key (profile_id, quality_key)
);

alter table voice_trait_scores enable row level security;
drop policy if exists "voice_scores: authenticated read" on voice_trait_scores;
create policy "voice_scores: authenticated read" on voice_trait_scores
  for select to authenticated using (true);
drop policy if exists "voice_scores: owner deletes" on voice_trait_scores;
create policy "voice_scores: owner deletes" on voice_trait_scores
  for delete using (auth.uid() = profile_id);

create table if not exists voice_profiles (
  profile_id         uuid primary key references profiles(id) on delete cascade,
  session_id         uuid references voice_sessions(id) on delete set null,
  summary            text,
  evidence           jsonb not null default '{}',  -- quality_key -> short paraphrase
  partner_priorities jsonb not null default '[]',  -- [{quality_key, weight}]
  dealbreakers       jsonb not null default '[]',  -- [{field, value}] a partner must not have
  updated_at         timestamptz not null default now()
);

alter table voice_profiles enable row level security;
drop policy if exists "voice_profiles: owner reads" on voice_profiles;
create policy "voice_profiles: owner reads" on voice_profiles
  for select using (auth.uid() = profile_id);
drop policy if exists "voice_profiles: owner deletes" on voice_profiles;
create policy "voice_profiles: owner deletes" on voice_profiles
  for delete using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- 4. Fused character score. A precision-weighted mean of three sources:
--      prior  : neutral 3, worth 1 observation
--      quiz   : the quiz score, worth evidence_n observations
--      voice  : the interview score, worth 2 x confidence (at most 1.6)
--    One Likert answer can't make someone a 5/5, and an interview can't
--    erase the quiz. Everything that ranks people reads this view.
-- ---------------------------------------------------------------------------
create or replace view character_scores with (security_invoker = true) as
with src as (
  select p.id as profile_id,
         q.key as quality_key,
         coalesce(qs.evidence_n, 0)::numeric        as nq,
         coalesce(qs.score, 3)::numeric             as sq,
         2.0 * coalesce(vs.confidence, 0)::numeric  as nv,
         coalesce(vs.score, 3)::numeric             as sv,
         qs.reason,
         (qs.profile_id is not null or vs.profile_id is not null) as has_any
  from profiles p
  cross join qualities q
  left join quiz_scores qs on qs.profile_id = p.id and qs.quality_key = q.key
  left join voice_trait_scores vs on vs.profile_id = p.id and vs.quality_key = q.key
)
select profile_id,
       quality_key,
       round((3 + nq * sq + nv * sv) / (1 + nq + nv), 2) as score,
       round((nq + nv) / (1 + nq + nv), 2)             as confidence,
       nv > 0                                          as from_voice,
       reason
from src
where has_any;
