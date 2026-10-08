-- Run this in Supabase SQL Editor to remove unused journal metadata.
alter table public.journal_entries
  drop column if exists excerpt,
  drop column if exists cover_image;
