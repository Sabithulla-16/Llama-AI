create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  is_shared boolean not null default false,
  share_token text unique,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  parent_id uuid references public.messages(id) on delete set null,
  branch_id integer,
  feedback text check (feedback in ('like', 'dislike')),
  model text check (model in ('llama', 'qwen', 'coder', 'mini', 'smart')),
  model_used text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme text check (theme in ('light', 'dark')),
  response_style text check (response_style in ('balanced', 'concise', 'detailed')),
  prompt_purpose text check (prompt_purpose in ('general', 'coding', 'business', 'study', 'writing')),
  enter_to_send boolean not null default true,
  read_after_send boolean not null default false,
  suggestion_count smallint not null default 4 check (suggestion_count in (4, 6)),
  voice_language text not null default 'en-US',
  read_voice_uri text not null default 'default',
  confirm_clear_chats boolean not null default true,
  chat_export_enabled boolean not null default false,
  data_analytics_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations
  add column if not exists is_shared boolean not null default false;

alter table public.conversations
  add column if not exists share_token text;

alter table public.conversations
  add column if not exists last_used_at timestamptz not null default now();

update public.conversations
set last_used_at = created_at
where last_used_at is null;

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

alter table public.messages
  add column if not exists model_used text;

alter table public.messages
  add column if not exists parent_id uuid references public.messages(id) on delete set null;

alter table public.messages
  add column if not exists branch_id integer;

alter table public.messages
  add column if not exists feedback text;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_feedback_valid'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_feedback_valid
      check (feedback is null or feedback in ('like', 'dislike'));
  end if;
end $$;

create index if not exists conversations_user_created_idx
  on public.conversations (user_id, created_at desc);

create index if not exists conversations_user_last_used_idx
  on public.conversations (user_id, last_used_at desc, created_at desc);

create index if not exists conversations_share_token_idx
  on public.conversations (share_token);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at asc);

create index if not exists messages_parent_branch_idx
  on public.messages (parent_id, branch_id);

-- Force PostgREST to refresh schema cache so new columns are recognized.
select pg_notify('pgrst', 'reload schema');
