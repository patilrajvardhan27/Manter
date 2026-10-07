-- Tracks whether a message has already been run through the FastAPI
-- red-flag scanner, so /scan can be idempotent per message instead of
-- re-calling the model (and re-billing the API) every time a client re-fetches
-- or reconnects. Written only by the service-role FastAPI backend.
-- Apply via Supabase Dashboard -> SQL Editor.

alter table messages add column if not exists scanned boolean not null default false;
