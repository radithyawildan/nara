alter table public.knowledge_chunks
  add column if not exists embedding_updated_at timestamptz;

update public.knowledge_chunks
set embedding_updated_at = coalesce(embedding_updated_at, created_at)
where embedding_updated_at is null;

drop policy if exists "knowledge_chunks_update_own"
on public.knowledge_chunks;

create policy "knowledge_chunks_update_own"
on public.knowledge_chunks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant update
on public.knowledge_chunks
to authenticated;
