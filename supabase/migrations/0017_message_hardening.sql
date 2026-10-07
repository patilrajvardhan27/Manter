-- 0017_message_hardening.sql
-- Tightens what a signed-in user can write to the chat tables. RLS already
-- limits reads and sends to the two participants; this closes the gaps RLS
-- alone leaves open. Safe to re-run.

-- 1) Messages are 1 to 2,000 characters. NOT VALID so any older, longer rows
--    don't block the migration; every new row is still checked.
alter table messages drop constraint if exists messages_body_length;
alter table messages add constraint messages_body_length
  check (char_length(btrim(body)) between 1 and 2000) not valid;

-- 2) A sender may only supply the match, themselves, and the text. Without
--    this they could insert with scanned = true (skipping the red-flag scan)
--    or a forged created_at/id. Messages stay immutable: no update or delete.
revoke all on messages from anon, authenticated;
grant select on messages to authenticated;
grant insert (match_id, sender_id, body) on messages to authenticated;

-- 3) Matches: the app never updates a match as the user (introductions open
--    them through a security-definer trigger). The old update policy let a
--    participant repoint seeker_id/target_id, handing the thread and its
--    messages to someone else.
drop policy if exists "matches: participants update" on matches;
revoke all on matches from anon, authenticated;
grant select, delete on matches to authenticated;
grant insert (seeker_id, target_id) on matches to authenticated;

-- 4) Live chat needs messages in the realtime publication.
do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;  -- already added
end $$;
