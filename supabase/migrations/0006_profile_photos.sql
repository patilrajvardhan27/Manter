-- Profile photos: a private Storage bucket + RLS that mirrors profile visibility,
-- plus a max-3 cap on profiles.photos. Apply via Supabase Dashboard -> SQL Editor.
-- Path convention: "<owner_id>/<filename>", so the first folder segment is the owner.

-- 1) Cap photos at 3 per profile.
do $$
begin
  alter table profiles
    add constraint profiles_photos_max3 check (coalesce(cardinality(photos), 0) <= 3);
exception
  when duplicate_object then null;
end $$;

-- 2) Private bucket (reads are gated by the policies below).
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- 3) Storage RLS. storage.objects already has RLS enabled in Supabase.

-- Owner fully manages their own folder (upload / replace / delete / read).
drop policy if exists "profile-photos: owner manages" on storage.objects;
create policy "profile-photos: owner manages" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Women may view men's photos (discovery).
drop policy if exists "profile-photos: women view men" on storage.objects;
create policy "profile-photos: women view men" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and public.is_woman(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = ((storage.foldername(name))[1])::uuid and p.role = 'man'
    )
  );

-- Matched participants may view each other's photos. For a man this only becomes
-- true once the woman has started the match (she swiped right), which is exactly
-- when her profile becomes visible to him.
drop policy if exists "profile-photos: matched participants view" on storage.objects;
create policy "profile-photos: matched participants view" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1 from public.matches m
      where (m.woman_id = auth.uid() and m.man_id = ((storage.foldername(name))[1])::uuid)
         or (m.man_id = auth.uid() and m.woman_id = ((storage.foldername(name))[1])::uuid)
    )
  );
