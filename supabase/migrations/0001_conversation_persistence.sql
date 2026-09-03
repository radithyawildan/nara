create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations(user_id, updated_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at asc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users can read own conversations"
  on public.conversations;

create policy "Users can read own conversations"
  on public.conversations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own conversations"
  on public.conversations;

create policy "Users can create own conversations"
  on public.conversations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own conversations"
  on public.conversations;

create policy "Users can update own conversations"
  on public.conversations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own conversations"
  on public.conversations;

create policy "Users can delete own conversations"
  on public.conversations
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own messages"
  on public.messages;

create policy "Users can read own messages"
  on public.messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own messages"
  on public.messages;

create policy "Users can create own messages"
  on public.messages
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own messages"
  on public.messages;

create policy "Users can delete own messages"
  on public.messages
  for delete
  using (auth.uid() = user_id);
