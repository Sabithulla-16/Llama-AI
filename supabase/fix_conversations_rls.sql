-- Run this once on an existing Supabase project to fix RLS insert failures.

alter table public.conversations
  alter column user_id set data type uuid using user_id::uuid;

alter table public.conversations
  alter column user_id set default auth.uid();

alter table public.conversations enable row level security;

alter table public.messages enable row level security;

drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own
on public.conversations
for select
to authenticated
using (user_id = auth.uid());

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
