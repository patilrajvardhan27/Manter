-- Let a woman unmatch a man she started a conversation with. Deleting the match
-- cascades to its messages (messages.match_id references matches on delete
-- cascade), so the whole thread disappears for both participants. Only the woman
-- (the initiator) may unmatch; the man cannot. Apply via Supabase Dashboard ->
-- SQL Editor.

drop policy if exists "matches: woman deletes" on matches;
create policy "matches: woman deletes" on matches
  for delete to authenticated
  using (auth.uid() = woman_id);
