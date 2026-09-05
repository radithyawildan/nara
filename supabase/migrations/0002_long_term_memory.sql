create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'custom'
    check (
      category in (
        'identity',
        'preference',
        'response_style',
        'interest',
        'custom'
      )
    ),
  content text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_user_enabled_idx
  on public.memories(user_id, is_enabled, updated_at desc);

alter table public.memories enable row level security;

drop policy if exists "Users can read own memories"
  on public.memories;

create policy "Users can read own memories"
  on public.memories
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own memories"
  on public.memories;

create policy "Users can create own memories"
  on public.memories
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own memories"
  on public.memories;

create policy "Users can update own memories"
  on public.memories
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own memories"
  on public.memories;

create policy "Users can delete own memories"
  on public.memories
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete
on table public.memories
to authenticated;
