alter table public.conversations
  add column if not exists last_used_at timestamptz not null default now();

update public.conversations
set last_used_at = created_at
where last_used_at is null;

create index if not exists conversations_user_last_used_idx
  on public.conversations (user_id, last_used_at desc, created_at desc);

-- Force PostgREST to refresh schema cache so new columns are recognized.
select pg_notify('pgrst', 'reload schema');
