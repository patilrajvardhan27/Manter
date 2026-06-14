-- Women browsing discovery/profile pages need to read a man's free-text quiz
-- answers (alongside his scores, already readable). Apply via Supabase
-- Dashboard -> SQL Editor.

drop policy if exists "answers: women read" on quiz_answers;
create policy "answers: women read" on quiz_answers
  for select to authenticated using (public.is_woman(auth.uid()));
