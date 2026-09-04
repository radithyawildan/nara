alter table public.knowledge_documents
  add column if not exists storage_path text;

alter table public.messages
  add column if not exists knowledge_citations jsonb not null default '[]'::jsonb;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'knowledge-files',
  'knowledge-files',
  false,
  8388608,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "knowledge_files_select_own"
on storage.objects;

create policy "knowledge_files_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "knowledge_files_insert_own"
on storage.objects;

create policy "knowledge_files_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "knowledge_files_update_own"
on storage.objects;

create policy "knowledge_files_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "knowledge_files_delete_own"
on storage.objects;

create policy "knowledge_files_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
