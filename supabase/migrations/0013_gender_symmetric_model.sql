-- Replaces the binary woman/man model with a gender-symmetric one: every
-- profile picks male/female/lgbtq, optionally who they're interested in, and
-- answers the same situational quiz (-> quiz_scores, quiz_answers) and sets
-- the same priority weights (-> priority_weights) regardless of gender.
-- Apply via Supabase Dashboard -> SQL Editor.
--
-- This is a destructive rebuild of the man/woman-specific tables (man_quiz_
-- scores, woman_weights, woman_quiz_answers, quiz_questions, quiz_answers,
-- ratings) — appropriate pre-launch with only seed/demo data. If real user
-- data exists, back it up first.

-- ---------------------------------------------------------------------------
-- 1. Drop views and policies that reference columns/tables being changed.
-- ---------------------------------------------------------------------------
drop view if exists matches_named;
drop view if exists woman_weights_named;
drop view if exists man_quiz_scores_named;
drop view if exists quiz_questions_named;
drop view if exists quiz_answers_named;
drop view if exists man_community_scores;

drop policy if exists "profiles: women read men" on profiles;
drop policy if exists "profiles: match participants read" on profiles;
drop policy if exists "matches: participants read" on matches;
drop policy if exists "matches: woman creates" on matches;
drop policy if exists "matches: participants update" on matches;
drop policy if exists "matches: woman deletes" on matches;
drop policy if exists "messages: participants read" on messages;
drop policy if exists "messages: participant sends own" on messages;
drop policy if exists "red_flags: woman in match reads" on red_flags;
drop policy if exists "profile-photos: women view men" on storage.objects;
drop policy if exists "profile-photos: matched participants view" on storage.objects;

-- ---------------------------------------------------------------------------
-- 2. Drop the old per-gender tables (and the unused ratings scaffold).
-- ---------------------------------------------------------------------------
drop table if exists woman_weights;
drop table if exists woman_quiz_answers;
drop table if exists man_quiz_scores;
drop table if exists quiz_questions;
drop table if exists quiz_answers;
drop table if exists ratings;

drop function if exists public.is_woman(uuid);

-- ---------------------------------------------------------------------------
-- 3. profiles: role -> gender (3-way), add interested_in.
-- ---------------------------------------------------------------------------
create type gender_identity as enum ('male', 'female', 'lgbtq');

alter table profiles add column gender gender_identity;
update profiles set gender = case role when 'woman' then 'female'::gender_identity
                                        when 'man' then 'male'::gender_identity end;
alter table profiles alter column gender set not null;
alter table profiles add column interested_in gender_identity[];

alter table profiles drop column role;
drop type if exists user_role;

-- ---------------------------------------------------------------------------
-- 4. matches: woman_id/man_id -> seeker_id/target_id.
-- ---------------------------------------------------------------------------
alter table matches rename column woman_id to seeker_id;
alter table matches rename column man_id to target_id;
alter table matches add constraint matches_no_self check (seeker_id <> target_id);

-- ---------------------------------------------------------------------------
-- 5. Recreate profiles/matches/messages/red_flags policies, generalized.
-- ---------------------------------------------------------------------------
create policy "profiles: authenticated read all" on profiles
  for select to authenticated using (true);

create policy "matches: participants read" on matches
  for select using (auth.uid() = seeker_id or auth.uid() = target_id);
create policy "matches: seeker creates" on matches
  for insert with check (auth.uid() = seeker_id);
create policy "matches: participants update" on matches
  for update using (auth.uid() = seeker_id or auth.uid() = target_id);
create policy "matches: seeker deletes" on matches
  for delete using (auth.uid() = seeker_id);

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

-- ---------------------------------------------------------------------------
-- 6. New generic tables: priority_weights, quiz_scores, quiz_answers.
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
-- 7. Recreate named views against the new shape.
-- ---------------------------------------------------------------------------
create or replace view matches_named with (security_invoker = true) as
select m.id, s.display_name as seeker, t.display_name as target,
       m.status, m.created_at, m.seeker_id, m.target_id
from matches m
join profiles s on s.id = m.seeker_id
join profiles t on t.id = m.target_id;

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
-- 8. Storage: open read to any signed-in user, same posture as profiles.
-- ---------------------------------------------------------------------------
create policy "profile-photos: authenticated view" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos');
