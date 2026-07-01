-- ============================================================================
-- Charms — Postgres schema + Row Level Security (Supabase)
-- Run in the Supabase SQL editor, or `supabase db push` with the CLI.
-- Default posture: RLS on, deny by default, grant the minimum each role needs.
--
-- Gender-symmetric model: every profile picks a gender, optionally who
-- they're interested in, answers the same situational quiz (-> quiz_scores,
-- quiz_answers), and sets the same priority weights (-> priority_weights).
-- Discovery and matching work the same way regardless of gender.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type gender_identity as enum ('male', 'female', 'lgbtq');
create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type match_status as enum ('pending', 'matched', 'passed', 'blocked');
create type checkin_status as enum ('scheduled', 'confirmed', 'missed', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles : 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  gender      gender_identity not null,
  -- Who they want to see in Discover. Null/empty = everyone.
  interested_in gender_identity[],
  display_name text not null,
  age         int check (age >= 18),
  city        text,
  bio         text,
  photos      text[] default '{}'             -- Storage paths (max 3)
              check (coalesce(cardinality(photos), 0) <= 3),
  -- Optional "about you" details surfaced on profiles (see 0009 migration).
  profession        text,
  education         text,
  height_cm         int  check (height_cm is null or height_cm between 120 and 250),
  drinking          text,
  smoking           text,
  exercise          text,
  relationship_goal text,
  interests         text[] default '{}'
              check (coalesce(cardinality(interests), 0) <= 12),
  verification verification_status not null default 'unverified',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);

-- Discovery is open browsing: any signed-in user may read any other profile's
-- public fields. Interest/gender filtering happens in the app query, not RLS
-- (the data isn't sensitive — photos and quiz answers/scores follow the same
-- posture below). Private preference data (priority_weights) stays gated.
create policy "profiles: authenticated read all" on profiles
  for select to authenticated using (true);

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
-- priority_weights : a profile's priorities (1..5) for what they want in a
-- partner. Private to its owner; a matched counterpart may read it.
-- ---------------------------------------------------------------------------
create table priority_weights (
  profile_id  uuid references profiles(id) on delete cascade,
  quality_key text references qualities(key) on delete cascade,
  weight      int not null check (weight between 1 and 5),
  primary key (profile_id, quality_key)
);

alter table priority_weights enable row level security;
create policy "weights: owner all" on priority_weights
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "weights: matched counterpart reads" on priority_weights
  for select to authenticated
  using (
    exists (
      select 1 from matches m
      where (m.seeker_id = priority_weights.profile_id and m.target_id = auth.uid())
         or (m.target_id = priority_weights.profile_id and m.seeker_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- quiz_scores : a profile's derived character score per quality (1..5),
-- scored deterministically from their situational quiz answers. Same
-- visibility as the quiz answers below — readable by anyone signed in, the
-- way a character score on a dating profile is meant to be seen.
-- ---------------------------------------------------------------------------
create table quiz_scores (
  profile_id  uuid references profiles(id) on delete cascade,
  quality_key text references qualities(key) on delete cascade,
  score       numeric(3,2) not null check (score between 1 and 5),
  reason      text,
  primary key (profile_id, quality_key)
);

alter table quiz_scores enable row level security;
create policy "scores: owner write" on quiz_scores
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "scores: authenticated read" on quiz_scores
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- quiz_answers : a profile's answer per situational quiz question (the
-- picked option's label, e.g. "Strongly agree"). question_id is a code-
-- defined id from lib/constants/situational-quiz.ts.
-- ---------------------------------------------------------------------------
create table quiz_answers (
  profile_id  uuid not null references profiles(id) on delete cascade,
  question_id text not null,
  answer      text not null,
  created_at  timestamptz not null default now(),
  primary key (profile_id, question_id)
);

alter table quiz_answers enable row level security;
create policy "answers: owner writes own" on quiz_answers
  for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "answers: authenticated read" on quiz_answers
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- matches : either side can discover and start a conversation; "seeker" is
-- whoever initiated it, gender-agnostic.
-- ---------------------------------------------------------------------------
create table matches (
  id         uuid primary key default gen_random_uuid(),
  seeker_id  uuid not null references profiles(id) on delete cascade,
  target_id  uuid not null references profiles(id) on delete cascade,
  status     match_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (seeker_id <> target_id),
  unique (seeker_id, target_id)
);

alter table matches enable row level security;
create policy "matches: participants read" on matches
  for select using (auth.uid() = seeker_id or auth.uid() = target_id);
create policy "matches: seeker creates" on matches
  for insert with check (auth.uid() = seeker_id);
create policy "matches: participants update" on matches
  for update using (auth.uid() = seeker_id or auth.uid() = target_id);
-- Whoever initiated may unmatch; deleting cascades to the thread's messages.
create policy "matches: seeker deletes" on matches
  for delete using (auth.uid() = seeker_id);

-- ---------------------------------------------------------------------------
-- messages : realtime chat, participants only.
-- ---------------------------------------------------------------------------
create table messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text not null,
  -- set by the FastAPI service (service role) once /scan has run on this
  -- message, so re-fetches don't re-bill Anthropic for the same message.
  scanned    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "messages: participants read" on messages
  for select using (
    exists (
      select 1 from matches m
      where m.id = match_id and (auth.uid() = m.seeker_id or auth.uid() = m.target_id)
    )
  );
create policy "messages: participant sends own" on messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from matches m
      where m.id = match_id and (auth.uid() = m.seeker_id or auth.uid() = m.target_id)
    )
  );

-- ---------------------------------------------------------------------------
-- red_flags : written by FastAPI (service role). Visible to whoever received
-- the flagged message (not the sender) — symmetric regardless of gender.
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
create policy "red_flags: recipient reads" on red_flags
  for select using (
    exists (
      select 1 from messages msg
      join matches m on m.id = msg.match_id
      where msg.id = message_id
        and auth.uid() <> msg.sender_id
        and (auth.uid() = m.seeker_id or auth.uid() = m.target_id)
    )
  );
-- inserts come from the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Safety : emergency contacts + date check-ins. Available to any profile.
-- ---------------------------------------------------------------------------
create table emergency_contacts (
  id        uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name      text not null,
  email     text,
  phone     text,
  created_at timestamptz not null default now()
);

alter table emergency_contacts enable row level security;
create policy "contacts: owner all" on emergency_contacts
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create table checkins (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  match_id      uuid references matches(id) on delete set null,
  scheduled_at  timestamptz not null,
  status        checkin_status not null default 'scheduled',
  last_location text,
  created_at    timestamptz not null default now()
);

alter table checkins enable row level security;
create policy "checkins: owner all" on checkins
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

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

-- ---------------------------------------------------------------------------
-- Readable views: the relational tables with profile names (+ quality labels)
-- joined in, so the dashboard shows who's who instead of UUIDs. Views, not
-- columns, so names never go stale. security_invoker keeps RLS in force.
-- ---------------------------------------------------------------------------
create or replace view matches_named with (security_invoker = true) as
select m.id, s.display_name as seeker, t.display_name as target,
       m.status, m.created_at, m.seeker_id, m.target_id
from matches m
join profiles s on s.id = m.seeker_id
join profiles t on t.id = m.target_id;

create or replace view messages_named with (security_invoker = true) as
select msg.id, msg.match_id, s.display_name as sender, msg.body, msg.created_at
from messages msg
join profiles s on s.id = msg.sender_id;

create or replace view priority_weights_named with (security_invoker = true) as
select p.display_name as profile, q.label as quality, pw.weight,
       pw.profile_id, pw.quality_key
from priority_weights pw
join profiles p on p.id = pw.profile_id
join qualities q on q.key = pw.quality_key;

create or replace view quiz_scores_named with (security_invoker = true) as
select p.display_name as profile, q.label as quality, qs.score, qs.reason,
       qs.profile_id, qs.quality_key
from quiz_scores qs
join profiles p on p.id = qs.profile_id
join qualities q on q.key = qs.quality_key;

create or replace view quiz_answers_named with (security_invoker = true) as
select p.display_name as profile, qa.question_id, qa.answer, qa.created_at, qa.profile_id
from quiz_answers qa
join profiles p on p.id = qa.profile_id;

-- ---------------------------------------------------------------------------
-- Storage : profile photos (private bucket). Path "<owner_id>/<filename>".
-- Reads mirror profile visibility: any signed-in user may view any profile's
-- photos (same open-discovery posture as the profiles table); everyone
-- manages their own folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

create policy "profile-photos: owner manages" on storage.objects
  for all to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile-photos: authenticated view" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos');
