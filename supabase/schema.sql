-- Rikitoism content model
-- Run this file in the Supabase SQL editor before opening admin.html.

create extension if not exists "pgcrypto";

create type public.content_status as enum ('draft', 'published');
create type public.creation_category as enum (
  'physics-research',
  'writing',
  'animation',
  'code',
  'abandoned'
);

-- Add the UUID of the account that should manage the site after creating it
-- in Supabase Authentication. No other authenticated account can write.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body jsonb not null default '{}'::jsonb,
  cover_image text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  cover_image text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  image_url text not null,
  subtitle text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.memory_timeline (
  id uuid primary key default gen_random_uuid(),
  date_label text not null,
  title text not null,
  description text not null default '',
  more_description text not null default '',
  sort_order integer not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe migration for projects that already ran the first version of this schema.
alter table public.memory_timeline
  add column if not exists more_description text not null default '';

insert into storage.buckets (id, name, public)
values ('memory-media', 'memory-media', true)
on conflict (id) do update set public = true;

create policy "public can view memory media"
  on storage.objects for select
  using (bucket_id = 'memory-media');

create policy "admins can upload memory media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'memory-media' and public.is_admin());

create policy "admins can update memory media"
  on storage.objects for update to authenticated
  using (bucket_id = 'memory-media' and public.is_admin())
  with check (bucket_id = 'memory-media' and public.is_admin());

create policy "admins can delete memory media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'memory-media' and public.is_admin());

create table public.core_interests (
  id uuid primary key default gen_random_uuid(),
  eyebrow text not null default '',
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text,
  playlist_url text,
  eyebrow text not null default '',
  sort_order integer not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default '',
  description text not null default '',
  image_url text,
  song_url text,
  sort_order integer not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shaped_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  medium text not null default '',
  short_description text not null default '',
  reflection text not null default '',
  image_url text,
  link_url text,
  sort_order integer not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category public.creation_category not null,
  status_label text not null default 'in progress',
  title text not null,
  short_description text not null default '',
  body jsonb not null default '{}'::jsonb,
  cover_image text,
  project_url text,
  github_url text,
  tags text[] not null default '{}',
  featured boolean not null default false,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'journal_entries', 'memories', 'memory_timeline', 'core_interests',
    'playlists', 'songs', 'shaped_items', 'creations', 'site_settings'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      table_name, table_name
    );
  end loop;
end;
$$;

alter table public.journal_entries enable row level security;
alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.memory_timeline enable row level security;
alter table public.core_interests enable row level security;
alter table public.playlists enable row level security;
alter table public.songs enable row level security;
alter table public.shaped_items enable row level security;
alter table public.creations enable row level security;
alter table public.site_settings enable row level security;

create policy "published journal entries are public"
  on public.journal_entries for select using (status = 'published');
create policy "published memories are public"
  on public.memories for select using (status = 'published');
create policy "published memory photos are public"
  on public.memory_photos for select using (
    exists (select 1 from public.memories m where m.id = memory_id and m.status = 'published')
  );
create policy "published timeline events are public"
  on public.memory_timeline for select using (status = 'published');
create policy "core interests are public"
  on public.core_interests for select using (true);
create policy "published playlists are public"
  on public.playlists for select using (status = 'published');
create policy "published songs are public"
  on public.songs for select using (status = 'published');
create policy "published shaped items are public"
  on public.shaped_items for select using (status = 'published');
create policy "published creations are public"
  on public.creations for select using (status = 'published');
create policy "public site settings are public"
  on public.site_settings for select using (true);

-- Admin writes are intentionally restricted to the accounts in admin_users.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'journal_entries', 'memories', 'memory_photos', 'memory_timeline',
    'core_interests', 'playlists', 'songs', 'shaped_items', 'creations',
    'site_settings'
  ] loop
    execute format(
      'create policy "admins can manage %I"
       on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
      table_name, table_name
    );
  end loop;
end;
$$;
