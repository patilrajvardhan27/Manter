-- Behavioral quiz: women author questions, men answer them.
-- Apply via Supabase Dashboard -> SQL Editor. Idempotent-ish (drops policies first).

-- Custom questions authored by women (the 6 defaults live in app code).
create table if not exists quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references profiles(id) on delete cascade,
  quality_key text references qualities(key) on delete cascade,
  prompt      text not null,
  options     jsonb not null,        -- [{ id, text, effects: { quality_key: delta } }]
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table quiz_questions enable row level security;

drop policy if exists "questions: read" on quiz_questions;
create policy "questions: read" on quiz_questions
  for select to authenticated using (true);

drop policy if exists "questions: women author" on quiz_questions;
create policy "questions: women author" on quiz_questions
  for insert to authenticated
  with check (auth.uid() = created_by and public.is_woman(auth.uid()));

drop policy if exists "questions: author manages" on quiz_questions;
create policy "questions: author manages" on quiz_questions
  for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "questions: author deletes" on quiz_questions;
create policy "questions: author deletes" on quiz_questions
  for delete to authenticated using (auth.uid() = created_by);

-- A man's answers. question_id is text so it can reference either a code-defined
-- default ("q1_decision") or a custom question's uuid.
create table if not exists quiz_answers (
  man_id      uuid not null references profiles(id) on delete cascade,
  question_id text not null,
  option_id   text not null,
  created_at  timestamptz not null default now(),
  primary key (man_id, question_id)
);

alter table quiz_answers enable row level security;

drop policy if exists "answers: man writes own" on quiz_answers;
create policy "answers: man writes own" on quiz_answers
  for all to authenticated using (auth.uid() = man_id) with check (auth.uid() = man_id);
