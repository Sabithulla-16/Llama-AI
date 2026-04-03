-- Run this once on an existing Supabase project to fix RLS insert failures.

-- If conversation_shares exists, drop dependent policies before changing user_id type.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'conversation_shares'
  ) then
    execute 'drop policy if exists conversation_shares_select_own on public.conversation_shares';
    execute 'drop policy if exists conversation_shares_insert_own on public.conversation_shares';
    execute 'drop policy if exists conversation_shares_update_own on public.conversation_shares';
    execute 'drop policy if exists conversation_shares_delete_own on public.conversation_shares';

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'conversation_shares'
        and column_name = 'user_id'
        and udt_name <> 'uuid'
    ) then
      execute 'alter table public.conversation_shares alter column user_id set data type uuid using user_id::uuid';
    end if;

    execute 'alter table public.conversation_shares enable row level security';
    execute 'create policy conversation_shares_select_own on public.conversation_shares for select to authenticated using (user_id = auth.uid())';
    execute 'create policy conversation_shares_insert_own on public.conversation_shares for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy conversation_shares_update_own on public.conversation_shares for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy conversation_shares_delete_own on public.conversation_shares for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

alter table public.conversations
  alter column user_id set data type uuid using user_id::uuid;

alter table public.conversations
  alter column user_id set default auth.uid();

alter table public.conversations
  add column if not exists is_shared boolean not null default false;

alter table public.conversations
  add column if not exists share_token text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_share_token_key'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_share_token_key unique (share_token);
  end if;
end $$;

alter table public.conversations enable row level security;

alter table public.messages enable row level security;

drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own
on public.conversations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists conversations_select_shared_public on public.conversations;
create policy conversations_select_shared_public
on public.conversations
for select
to anon, authenticated
using (is_shared = true and share_token is not null);

drop policy if exists conversations_insert_own on public.conversations;
create policy conversations_insert_own
on public.conversations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists conversations_update_own on public.conversations;
create policy conversations_update_own
on public.conversations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists conversations_delete_own on public.conversations;
create policy conversations_delete_own
on public.conversations
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists messages_select_own on public.messages;
create policy messages_select_own
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists messages_select_shared_public on public.messages;
create policy messages_select_shared_public
on public.messages
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.is_shared = true
      and c.share_token is not null
  )
);

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists messages_update_own on public.messages;
create policy messages_update_own
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own
on public.messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);
