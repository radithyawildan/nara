create extension if not exists vector
with schema extensions;

alter table public.memories
  add column if not exists embedding extensions.vector(768);

alter table public.memories
  add column if not exists embedding_model text;

alter table public.memories
  add column if not exists embedding_updated_at timestamptz;

create or replace function public.match_memories(
  query_embedding extensions.vector(768),
  match_threshold double precision default 0.45,
  match_count integer default 6
)
returns table (
  id uuid,
  category text,
  content text,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    m.id,
    m.category,
    m.content,
    m.updated_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memories as m
  where
    m.user_id = auth.uid()
    and m.is_enabled = true
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) >= match_threshold
  order by m.embedding <=> query_embedding
  limit least(
    greatest(match_count, 1),
    20
  );
$$;

grant execute
on function public.match_memories(
  extensions.vector,
  double precision,
  integer
)
to authenticated;
