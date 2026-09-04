create extension if not exists vector
with schema extensions;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'error')),
  page_count integer not null default 0 check (page_count >= 0),
  chunk_count integer not null default 0 check (chunk_count >= 0),
  character_count integer not null default 0 check (character_count >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  page_number integer check (page_number is null or page_number > 0),
  content text not null,
  embedding extensions.vector(768) not null,
  embedding_model text not null,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists knowledge_documents_user_updated_idx
on public.knowledge_documents(user_id, updated_at desc);

create index if not exists knowledge_chunks_document_idx
on public.knowledge_chunks(document_id, chunk_index);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "knowledge_documents_select_own"
on public.knowledge_documents;

create policy "knowledge_documents_select_own"
on public.knowledge_documents
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "knowledge_documents_insert_own"
on public.knowledge_documents;

create policy "knowledge_documents_insert_own"
on public.knowledge_documents
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "knowledge_documents_update_own"
on public.knowledge_documents;

create policy "knowledge_documents_update_own"
on public.knowledge_documents
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "knowledge_documents_delete_own"
on public.knowledge_documents;

create policy "knowledge_documents_delete_own"
on public.knowledge_documents
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "knowledge_chunks_select_own"
on public.knowledge_chunks;

create policy "knowledge_chunks_select_own"
on public.knowledge_chunks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "knowledge_chunks_insert_own"
on public.knowledge_chunks;

create policy "knowledge_chunks_insert_own"
on public.knowledge_chunks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "knowledge_chunks_delete_own"
on public.knowledge_chunks;

create policy "knowledge_chunks_delete_own"
on public.knowledge_chunks
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete
on public.knowledge_documents
to authenticated;

grant select, insert, delete
on public.knowledge_chunks
to authenticated;

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(768),
  match_threshold double precision default 0.42,
  match_count integer default 6
)
returns table (
  chunk_id uuid,
  document_id uuid,
  filename text,
  page_number integer,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    kc.id as chunk_id,
    kc.document_id,
    kd.filename,
    kc.page_number,
    kc.chunk_index,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks as kc
  join public.knowledge_documents as kd
    on kd.id = kc.document_id
  where
    kc.user_id = auth.uid()
    and kd.user_id = auth.uid()
    and kd.status = 'ready'
    and 1 - (kc.embedding <=> query_embedding) >= match_threshold
  order by kc.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 12);
$$;

grant execute
on function public.match_knowledge_chunks(
  extensions.vector,
  double precision,
  integer
)
to authenticated;
