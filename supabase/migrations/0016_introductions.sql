-- Introductions: one person at a time, mutual opt-in, 24 hours to answer.
-- A match (and its chat) only exists once both people say "interested".
-- Safe to re-run. Apply via Supabase Dashboard -> SQL Editor.

do $$ begin
  create type intro_status as enum ('pending', 'matched', 'declined', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type intro_decision as enum ('interested', 'pass');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- introductions : written by the matchmaker job (service role). Users never
-- touch the table directly: they read it through my_introductions() and
-- answer through respond_to_introduction(). That keeps each side's reasons
-- private, since reasons_b is derived from b's private priority weights.
-- ---------------------------------------------------------------------------
create table if not exists introductions (
  id           uuid primary key default gen_random_uuid(),
  a_id         uuid not null references profiles(id) on delete cascade,
  b_id         uuid not null references profiles(id) on delete cascade,
  score        numeric(4,1) not null check (score between 0 and 100),
  reasons_a    text[] not null default '{}',  -- quality keys: why b fits what a wants
  reasons_b    text[] not null default '{}',  -- quality keys: why a fits what b wants
  status       intro_status not null default 'pending',
  a_decision   intro_decision,
  b_decision   intro_decision,
  a_decided_at timestamptz,
  b_decided_at timestamptz,
  match_id     uuid references matches(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  closed_at    timestamptz,
  -- canonical order, so (a, b) and (b, a) can't both exist
  check (a_id < b_id),
  -- a pair is introduced at most once, ever
  unique (a_id, b_id)
);
create index if not exists introductions_pending_a on introductions (a_id) where status = 'pending';
create index if not exists introductions_pending_b on introductions (b_id) where status = 'pending';

alter table introductions enable row level security;
-- No policies on purpose: deny all direct access for anon/authenticated.

-- One live introduction per person. The job already guarantees this; the
-- trigger catches bugs and overlapping runs.
create or replace function introductions_one_pending() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from introductions i
    where i.status = 'pending' and i.expires_at > now()
      and (i.a_id in (new.a_id, new.b_id) or i.b_id in (new.a_id, new.b_id))
  ) then
    raise exception 'person already has a pending introduction' using errcode = '23505';
  end if;
  return new;
end $$;

drop trigger if exists introductions_one_pending on introductions;
create trigger introductions_one_pending before insert on introductions
  for each row execute function introductions_one_pending();

-- When decisions land: any pass closes it; two interested opens a match.
-- Lives in a trigger so every write path (RPC, service role, dashboard)
-- gets the same outcome.
create or replace function introductions_finalize() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mid uuid;
begin
  if new.status <> 'pending' then
    return new;
  end if;
  if new.a_decision = 'pass' or new.b_decision = 'pass' then
    new.status := 'declined';
    new.closed_at := now();
  elsif new.a_decision = 'interested' and new.b_decision = 'interested' then
    select m.id into mid from matches m
     where (m.seeker_id = new.a_id and m.target_id = new.b_id)
        or (m.seeker_id = new.b_id and m.target_id = new.a_id)
     limit 1;
    if mid is null then
      insert into matches (seeker_id, target_id, status)
      values (new.a_id, new.b_id, 'matched')
      returning id into mid;
    else
      update matches set status = 'matched' where id = mid;
    end if;
    new.match_id := mid;
    new.status := 'matched';
    new.closed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists introductions_finalize on introductions;
create trigger introductions_finalize before update of a_decision, b_decision on introductions
  for each row execute function introductions_finalize();

-- ---------------------------------------------------------------------------
-- respond_to_introduction : the only way a user answers. One answer per
-- side, no flip-flopping, nothing after expiry.
-- ---------------------------------------------------------------------------
create or replace function respond_to_introduction(p_intro uuid, p_decision intro_decision)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r   introductions;
  uid uuid := auth.uid();
begin
  select * into r from introductions where id = p_intro for update;
  if not found or uid is null or uid not in (r.a_id, r.b_id) then
    raise exception 'introduction not found' using errcode = 'P0002';
  end if;

  if r.status = 'pending' and r.expires_at <= now() then
    update introductions set status = 'expired', closed_at = now()
     where id = p_intro returning * into r;
  elsif r.status = 'pending' and uid = r.a_id and r.a_decision is null then
    update introductions set a_decision = p_decision, a_decided_at = now()
     where id = p_intro returning * into r;
  elsif r.status = 'pending' and uid = r.b_id and r.b_decision is null then
    update introductions set b_decision = p_decision, b_decided_at = now()
     where id = p_intro returning * into r;
  end if;

  return jsonb_build_object('status', r.status, 'match_id', r.match_id);
end $$;

revoke all on function respond_to_introduction(uuid, intro_decision) from public, anon;
grant execute on function respond_to_introduction(uuid, intro_decision) to authenticated;

-- ---------------------------------------------------------------------------
-- introduction_feedback : "would you meet them again?" after a match. This
-- is the label the learning step trusts most.
-- ---------------------------------------------------------------------------
create table if not exists introduction_feedback (
  intro_id         uuid not null references introductions(id) on delete cascade,
  rater_id         uuid not null references profiles(id) on delete cascade,
  would_meet_again boolean not null,
  note             text check (note is null or char_length(note) <= 500),
  created_at       timestamptz not null default now(),
  primary key (intro_id, rater_id)
);

alter table introduction_feedback enable row level security;
drop policy if exists "feedback: rater reads own" on introduction_feedback;
create policy "feedback: rater reads own" on introduction_feedback
  for select using (auth.uid() = rater_id);

create or replace function submit_intro_feedback(p_intro uuid, p_would_meet_again boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from introductions i
    where i.id = p_intro and i.status = 'matched' and auth.uid() in (i.a_id, i.b_id)
  ) then
    raise exception 'introduction not found' using errcode = 'P0002';
  end if;
  insert into introduction_feedback (intro_id, rater_id, would_meet_again, note)
  values (p_intro, auth.uid(), p_would_meet_again, nullif(left(trim(coalesce(p_note, '')), 500), ''))
  on conflict (intro_id, rater_id) do update
    set would_meet_again = excluded.would_meet_again, note = excluded.note, created_at = now();
end $$;

revoke all on function submit_intro_feedback(uuid, boolean, text) from public, anon;
grant execute on function submit_intro_feedback(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- my_introductions : the caller's side of every introduction they're in.
-- Never exposes the other side's reasons or an unrevealed decision.
-- ---------------------------------------------------------------------------
create or replace function my_introductions()
returns table (
  id          uuid,
  other_id    uuid,
  score       numeric,
  reasons     text[],
  status      intro_status,
  my_decision intro_decision,
  match_id    uuid,
  created_at  timestamptz,
  expires_at  timestamptz,
  my_feedback boolean
)
language sql stable security definer set search_path = public as $$
  select i.id,
         case when i.a_id = auth.uid() then i.b_id else i.a_id end,
         i.score,
         case when i.a_id = auth.uid() then i.reasons_a else i.reasons_b end,
         case when i.status = 'pending' and i.expires_at <= now() then 'expired'::intro_status else i.status end,
         case when i.a_id = auth.uid() then i.a_decision else i.b_decision end,
         i.match_id,
         i.created_at,
         i.expires_at,
         (select f.would_meet_again from introduction_feedback f
           where f.intro_id = i.id and f.rater_id = auth.uid())
  from introductions i
  where auth.uid() in (i.a_id, i.b_id)
  order by i.created_at desc
$$;

revoke all on function my_introductions() from public, anon;
grant execute on function my_introductions() to authenticated;

-- ---------------------------------------------------------------------------
-- preference_offsets : what the matchmaker learned from your outcomes, as a
-- delta on each stated weight. Recomputed by every round. Owner reads it so
-- the app can show "you say yes more often to people who are reliable".
-- ---------------------------------------------------------------------------
create table if not exists preference_offsets (
  profile_id  uuid references profiles(id) on delete cascade,
  quality_key text references qualities(key) on delete cascade,
  delta       numeric(4,2) not null check (delta between -2 and 2),
  updated_at  timestamptz not null default now(),
  primary key (profile_id, quality_key)
);

alter table preference_offsets enable row level security;
drop policy if exists "offsets: owner reads" on preference_offsets;
create policy "offsets: owner reads" on preference_offsets
  for select using (auth.uid() = profile_id);
