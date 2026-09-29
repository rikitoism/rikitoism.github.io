-- Private-by-default guestbook submissions with admin moderation.
-- Run this migration in the Supabase SQL editor. It can be rerun to upgrade
-- an existing guestbook with the optional feeling field and updated RPC.

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  name text,
  message text not null,
  type text not null check (type in ('opinion', 'appreciation', 'confession', 'criticism', 'something-else')),
  feeling text,
  is_anonymous boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  reply text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint guestbook_name_length check (name is null or char_length(name) <= 60),
  constraint guestbook_message_length check (char_length(message) between 1 and 1200),
  constraint guestbook_reply_length check (reply is null or char_length(reply) <= 1200)
);

alter table public.guestbook_entries add column if not exists feeling text;
alter table public.guestbook_entries drop constraint if exists guestbook_entries_status_check;
alter table public.guestbook_entries add constraint guestbook_entries_status_check
  check (status in ('pending', 'approved', 'hidden'));
alter table public.guestbook_entries drop constraint if exists guestbook_feeling_check;
alter table public.guestbook_entries add constraint guestbook_feeling_check
  check (feeling is null or feeling in ('😢', '😕', '😐', '🙂', '🥰'));

create index if not exists guestbook_approved_order_idx
  on public.guestbook_entries (approved_at desc)
  where status = 'approved';
create index if not exists guestbook_pending_order_idx
  on public.guestbook_entries (created_at asc)
  where status = 'pending';

alter table public.guestbook_entries enable row level security;

drop policy if exists "approved guestbook entries are public" on public.guestbook_entries;
create policy "approved guestbook entries are public"
  on public.guestbook_entries for select
  using (status = 'approved');

drop policy if exists "admins can manage guestbook entries" on public.guestbook_entries;
create policy "admins can manage guestbook entries"
  on public.guestbook_entries for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.guestbook_entries to anon, authenticated;
grant update, delete on public.guestbook_entries to authenticated;

create table if not exists public.guestbook_rate_limits (
  rate_key uuid primary key,
  last_submission_at timestamptz not null default now()
);
alter table public.guestbook_rate_limits enable row level security;
revoke all on public.guestbook_rate_limits from anon, authenticated;

drop function if exists public.submit_guestbook_entry(text, text, text, boolean, uuid);
create or replace function public.submit_guestbook_entry(
  p_name text,
  p_message text,
  p_type text,
  p_feeling text,
  p_anonymous boolean,
  p_rate_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry_id uuid;
  v_rate_key uuid;
  v_message text := btrim(coalesce(p_message, ''));
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if char_length(v_message) not between 1 and 1200 then
    raise exception 'message must be between 1 and 1200 characters';
  end if;
  if v_name is not null and char_length(v_name) > 60 then
    raise exception 'name must be 60 characters or fewer';
  end if;
  if p_type is null or p_type not in ('opinion', 'appreciation', 'confession', 'criticism', 'something-else') then
    raise exception 'invalid guestbook type';
  end if;
  if p_rate_key is null then
    raise exception 'rate limit key is required';
  end if;
  if p_feeling is not null and p_feeling not in ('😢', '😕', '😐', '🙂', '🥰') then
    raise exception 'invalid guestbook feeling';
  end if;

  insert into public.guestbook_rate_limits (rate_key, last_submission_at)
  values (p_rate_key, now())
  on conflict (rate_key) do update
    set last_submission_at = excluded.last_submission_at
    where public.guestbook_rate_limits.last_submission_at < now() - interval '30 minutes'
  returning rate_key into v_rate_key;

  if not found then
    raise exception 'guestbook rate limit reached';
  end if;

  insert into public.guestbook_entries (name, message, type, feeling, is_anonymous)
  values (case when coalesce(p_anonymous, true) then null else v_name end, v_message, p_type, p_feeling, coalesce(p_anonymous, true))
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.submit_guestbook_entry(text, text, text, text, boolean, uuid) from public;
grant execute on function public.submit_guestbook_entry(text, text, text, text, boolean, uuid) to anon, authenticated;
