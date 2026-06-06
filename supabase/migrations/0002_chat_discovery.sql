-- Chat + discovery support. Apply via Supabase Dashboard -> SQL Editor. Idempotent.

-- 1) Matched users may read each other's profile (chat headers, conversation
--    list). Without this a man can't see the woman's name in a match, since the
--    base policies only let women read men. References matches, whose own
--    policies don't touch profiles, so no recursion.
drop policy if exists "profiles: match participants read" on profiles;
create policy "profiles: match participants read" on profiles
  for select using (
    exists (
      select 1 from matches m
      where (m.woman_id = auth.uid() and m.man_id = profiles.id)
         or (m.man_id = auth.uid() and m.woman_id = profiles.id)
    )
  );

-- 2) Realtime for live chat: add messages to the supabase_realtime publication.
do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;  -- already added
end $$;
