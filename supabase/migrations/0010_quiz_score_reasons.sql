-- Store Claude's one-sentence reason alongside each per-quality score, so a
-- man can see what specifically drove a low (or high) score.
-- Apply via Supabase Dashboard -> SQL Editor.

alter table man_quiz_scores add column if not exists reason text;

-- `create or replace view` can't reorder/insert columns into an existing view
-- (only append), so drop and recreate to add `reason` after `score`.
drop view if exists man_quiz_scores_named;
create view man_quiz_scores_named with (security_invoker = true) as
select p.display_name as man, q.label as quality, ms.score, ms.reason,
       ms.man_id, ms.quality_key
from man_quiz_scores ms
join profiles p on p.id = ms.man_id
join qualities q on q.key = ms.quality_key;
