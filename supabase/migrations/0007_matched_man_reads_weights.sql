-- A matched man may read his match's priority weights, so her full profile
-- (priorities + authored questions) is visible to him once she's liked him.
-- Apply via Supabase Dashboard -> SQL Editor. The owner policy stays in place.

drop policy if exists "weights: matched man reads" on woman_weights;
create policy "weights: matched man reads" on woman_weights
  for select to authenticated
  using (
    exists (
      select 1 from matches m
      where m.woman_id = woman_weights.woman_id and m.man_id = auth.uid()
    )
  );
