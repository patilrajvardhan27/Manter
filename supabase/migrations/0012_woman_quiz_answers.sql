-- Stores a woman's free-text answers to the onboarding priorities quiz
-- (the picked option's label, e.g. "Strongly agree"), so a matched man can
-- see her answers the same way she can see his. Apply via Supabase
-- Dashboard -> SQL Editor.

create table woman_quiz_answers (
  woman_id    uuid references profiles(id) on delete cascade,
  question_id text not null,
  answer      text not null,
  created_at  timestamptz not null default now(),
  primary key (woman_id, question_id)
);

alter table woman_quiz_answers enable row level security;
create policy "woman answers: owner all" on woman_quiz_answers
  for all using (auth.uid() = woman_id) with check (auth.uid() = woman_id);
create policy "woman answers: matched man reads" on woman_quiz_answers
  for select to authenticated
  using (
    exists (
      select 1 from matches m
      where m.woman_id = woman_quiz_answers.woman_id and m.man_id = auth.uid()
    )
  );
