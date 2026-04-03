create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  is_shared boolean not null default false,
  share_token text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model text check (model in ('llama', 'qwen', 'coder', 'mini', 'smart')),
  created_at timestamptz not null default now()
);

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

alter table public.messages
  add column if not exists model text check (model in ('llama', 'qwen', 'coder', 'mini', 'smart'));

create index if not exists conversations_user_created_idx
  on public.conversations (user_id, created_at desc);

create index if not exists conversations_share_token_idx
  on public.conversations (share_token);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at asc);
