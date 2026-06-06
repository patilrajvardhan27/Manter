-- Quiz answers are now free text (men type their answers; Claude scores them)
-- instead of a chosen option. Apply via Supabase Dashboard -> SQL Editor.

-- Rename the column if the old one is still there.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'quiz_answers' and column_name = 'option_id'
  ) then
    alter table quiz_answers rename column option_id to answer;
  end if;
end $$;

-- Custom questions are open-ended now; existing options aren't used.
-- (Kept nullable-friendly: new custom questions store an empty array.)
