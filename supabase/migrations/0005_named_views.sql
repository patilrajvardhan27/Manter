-- Readable companions to the relational tables: same rows, but with profile
-- display names (and quality labels) joined in, so you can tell who's who in
-- the dashboard without copy-pasting UUIDs. Views, not columns, so names never
-- go stale. security_invoker = true keeps RLS in force for app callers.
-- Apply via Supabase Dashboard -> SQL Editor.

create or replace view matches_named with (security_invoker = true) as
select m.id, w.display_name as woman, mp.display_name as man,
       m.status, m.created_at, m.woman_id, m.man_id
from matches m
join profiles w on w.id = m.woman_id
join profiles mp on mp.id = m.man_id;

create or replace view messages_named with (security_invoker = true) as
select msg.id, msg.match_id, s.display_name as sender, msg.body, msg.created_at
from messages msg
join profiles s on s.id = msg.sender_id;

create or replace view woman_weights_named with (security_invoker = true) as
select w.display_name as woman, q.label as quality, ww.weight,
       ww.woman_id, ww.quality_key
from woman_weights ww
join profiles w on w.id = ww.woman_id
join qualities q on q.key = ww.quality_key;

create or replace view man_quiz_scores_named with (security_invoker = true) as
select p.display_name as man, q.label as quality, ms.score,
       ms.man_id, ms.quality_key
from man_quiz_scores ms
join profiles p on p.id = ms.man_id
join qualities q on q.key = ms.quality_key;

create or replace view quiz_questions_named with (security_invoker = true) as
select qq.id, a.display_name as author, q.label as quality,
       qq.prompt, qq.active, qq.created_at
from quiz_questions qq
left join profiles a on a.id = qq.created_by
left join qualities q on q.key = qq.quality_key;

create or replace view quiz_answers_named with (security_invoker = true) as
select p.display_name as man, qa.question_id, qa.answer, qa.created_at, qa.man_id
from quiz_answers qa
join profiles p on p.id = qa.man_id;
