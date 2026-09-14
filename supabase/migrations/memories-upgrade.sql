-- Run this once in Supabase SQL Editor for an existing project.
alter table public.memory_timeline
  add column if not exists more_description text not null default '';

insert into storage.buckets (id, name, public)
values ('memory-media', 'memory-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public can view memory media" on storage.objects;
drop policy if exists "admins can upload memory media" on storage.objects;
drop policy if exists "admins can update memory media" on storage.objects;
drop policy if exists "admins can delete memory media" on storage.objects;

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
