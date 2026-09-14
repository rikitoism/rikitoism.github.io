-- Run this once if the Creations table was created before these fields existed.
alter table public.creations add column if not exists github_url text;
alter table public.creations add column if not exists featured boolean not null default false;
