-- ============================================================================
-- Manter — Postgres schema + Row Level Security (Supabase)
-- Run in the Supabase SQL editor, or `supabase db push` with the CLI.
-- Default posture: RLS on, deny by default, grant the minimum each role needs.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('woman', 'man');
create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type match_status as enum ('pending', 'matched', 'passed', 'blocked');
create type checkin_status as enum ('scheduled', 'confirmed', 'missed', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles : 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  display_name text not null,
  age         int check (age >= 18),
  city        text,
  bio         text,
  photos      text[] default '{}',            -- Storage paths
  verification verification_status not null default 'unverified',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);

-- Women may browse men's public profile fields (curated discovery).
create policy "profiles: women read men" on profiles
  for select using (
    role = 'man'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'woman')
  );

create policy "profiles: insert own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- qualities : reference data (the 23). Readable by all authenticated users.
-- ---------------------------------------------------------------------------
create table qualities (
  key    text primary key,
  n      int not null,
  label  text not null,
  grp    text not null
);

alter table qualities enable row level security;
create policy "qualities: read all" on qualities for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- woman_weights : her priorities (1..5). Private to her.
-- ---------------------------------------------------------------------------
create table woman_weights (
  woman_id   uuid references profiles(id) on delete cascade,
  quality_key text references qualities(key) on delete cascade,
  weight     int not null check (weight between 1 and 5),
  primary key (woman_id, quality_key)
);

alter table woman_weights enable row level security;
create policy "weights: owner all" on woman_weights
  for all using (auth.uid() = woman_id) with check (auth.uid() = woman_id);

-- ---------------------------------------------------------------------------
-- man_quiz_scores : derived self-assessment per quality (1..5).
-- ---------------------------------------------------------------------------
create table man_quiz_scores (
  man_id     uuid references profiles(id) on delete cascade,
  quality_key text references qualities(key) on delete cascade,
  score      numeric(3,2) not null check (score between 1 and 5),
  primary key (man_id, quality_key)
);

alter table man_quiz_scores enable row level security;
create policy "quiz: owner write" on man_quiz_scores
  for all using (auth.uid() = man_id) with check (auth.uid() = man_id);
create policy "quiz: women read" on man_quiz_scores
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'woman')
  );

-- ---------------------------------------------------------------------------
-- ratings : women rate men they've dated. Anonymous to the man.
-- ---------------------------------------------------------------------------
create table ratings (
  id          uuid primary key default gen_random_uuid(),
  rater_id    uuid not null references profiles(id) on delete cascade,
  rated_man_id uuid not null references profiles(id) on delete cascade,
  quality_key text not null references qualities(key),
  score       int not null check (score between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (rater_id, rated_man_id, quality_key)
);

alter table ratings enable row level security;
create policy "ratings: rater write" on ratings
  for all using (auth.uid() = rater_id) with check (auth.uid() = rater_id);
-- NOTE: men can NOT read individual ratings; only aggregates via the view below.

-- Aggregate community score (no per-rater identity leaks).
create view man_community_scores
  with (security_invoker = true) as
  select rated_man_id as man_id,
         quality_key,
         round(avg(score)::numeric, 2) as community_avg,
         count(*)                      as community_n
  from ratings
  group by rated_man_id, quality_key;

-- ---------------------------------------------------------------------------
-- matches : women-first. The woman initiates contact.
-- ---------------------------------------------------------------------------
create table matches (
  id         uuid primary key default gen_random_uuid(),
  woman_id   uuid not null references profiles(id) on delete cascade,
  man_id     uuid not null references profiles(id) on delete cascade,
  status     match_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (woman_id, man_id)
);

alter table matches enable row level security;
create policy "matches: participants read" on matches
  for select using (auth.uid() = woman_id or auth.uid() = man_id);
create policy "matches: woman creates" on matches
  for insert with check (auth.uid() = woman_id);
create policy "matches: participants update" on matches
  for update using (auth.uid() = woman_id or auth.uid() = man_id);

-- ---------------------------------------------------------------------------
-- messages : realtime chat, participants only.
-- ---------------------------------------------------------------------------
create table messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "messages: participants read" on messages
  for select using (
    exists (
      select 1 from matches m
      where m.id = match_id and (auth.uid() = m.woman_id or auth.uid() = m.man_id)
    )
  );
create policy "messages: participant sends own" on messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from matches m
      where m.id = match_id and (auth.uid() = m.woman_id or auth.uid() = m.man_id)
    )
  );

-- ---------------------------------------------------------------------------
-- red_flags : written by FastAPI (service role). Visible to the woman in the match.
-- ---------------------------------------------------------------------------
create table red_flags (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  category   text not null,
  severity   text not null check (severity in ('low','medium','high')),
  rationale  text not null,
  created_at timestamptz not null default now()
);

alter table red_flags enable row level security;
create policy "red_flags: woman in match reads" on red_flags
  for select using (
    exists (
      select 1 from messages msg
      join matches m on m.id = msg.match_id
      where msg.id = message_id and auth.uid() = m.woman_id
    )
  );
-- inserts come from the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Safety : emergency contacts + date check-ins.
-- ---------------------------------------------------------------------------
create table emergency_contacts (
  id        uuid primary key default gen_random_uuid(),
  woman_id  uuid not null references profiles(id) on delete cascade,
  name      text not null,
  email     text,
  phone     text,
  created_at timestamptz not null default now()
);

alter table emergency_contacts enable row level security;
create policy "contacts: owner all" on emergency_contacts
  for all using (auth.uid() = woman_id) with check (auth.uid() = woman_id);

create table checkins (
  id            uuid primary key default gen_random_uuid(),
  woman_id      uuid not null references profiles(id) on delete cascade,
  match_id      uuid references matches(id) on delete set null,
  scheduled_at  timestamptz not null,
  status        checkin_status not null default 'scheduled',
  last_location text,
  created_at    timestamptz not null default now()
);

alter table checkins enable row level security;
create policy "checkins: owner all" on checkins
  for all using (auth.uid() = woman_id) with check (auth.uid() = woman_id);

-- ---------------------------------------------------------------------------
-- reports / blocks : moderation.
-- ---------------------------------------------------------------------------
create table reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles(id) on delete cascade,
  reported_id  uuid not null references profiles(id) on delete cascade,
  reason       text not null,
  created_at   timestamptz not null default now()
);

alter table reports enable row level security;
create policy "reports: reporter writes" on reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports: reporter reads own" on reports
  for select using (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for profiles
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
