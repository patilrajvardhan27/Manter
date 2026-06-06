-- Fix: "infinite recursion detected in policy for relation profiles" (42P17).
-- The "profiles: women read men" SELECT policy subqueried profiles itself,
-- which re-triggered the policy. Move the woman-check into a SECURITY DEFINER
-- function (runs without RLS) so the policy no longer recurses. The
-- man_quiz_scores "women read" policy is switched to the same helper.
--
-- Apply via Supabase Dashboard -> SQL Editor (or psql). Idempotent.

create or replace function public.is_woman(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = uid and role = 'woman');
$$;

drop policy if exists "profiles: women read men" on profiles;
create policy "profiles: women read men" on profiles
  for select using (role = 'man' and public.is_woman(auth.uid()));

drop policy if exists "quiz: women read" on man_quiz_scores;
create policy "quiz: women read" on man_quiz_scores
  for select using (public.is_woman(auth.uid()));
