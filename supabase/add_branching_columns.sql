-- Run this in Supabase SQL editor for existing databases.
alter table public.messages
  add column if not exists parent_id uuid references public.messages(id) on delete set null;

alter table public.messages
  add column if not exists branch_id integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_branch_id_non_negative'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_branch_id_non_negative
      check (branch_id is null or branch_id >= 0);
  end if;
end $$;

create index if not exists messages_parent_branch_idx
  on public.messages (parent_id, branch_id);

-- Force PostgREST to refresh schema cache so new columns are recognized.
select pg_notify('pgrst', 'reload schema');
