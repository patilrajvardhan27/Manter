-- Richer profile fields: profession, education, height, lifestyle habits,
-- relationship goal, and free-form interests. All optional (nullable / empty
-- array) so existing profiles stay valid. Apply via Supabase Dashboard -> SQL
-- Editor. No RLS changes — these ride on the existing profiles policies.

alter table profiles
  add column if not exists profession        text,
  add column if not exists education         text,
  add column if not exists height_cm         int  check (height_cm is null or height_cm between 120 and 250),
  add column if not exists drinking          text,
  add column if not exists smoking           text,
  add column if not exists exercise          text,
  add column if not exists relationship_goal text,
  add column if not exists interests         text[] default '{}'
                                             check (coalesce(cardinality(interests), 0) <= 12);
