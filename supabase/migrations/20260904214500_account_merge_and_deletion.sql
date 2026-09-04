create or replace function public.merge_anonymous_account_data(
  source_user_id uuid,
  target_user_id uuid,
  storage_path_map jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  source_is_anonymous boolean;
  target_is_anonymous boolean;
  conversation_count integer := 0;
  message_count integer := 0;
  memory_count integer := 0;
  document_count integer := 0;
  chunk_count integer := 0;
begin
  if source_user_id is null or target_user_id is null then
    raise exception 'Source and target user IDs are required.';
  end if;

  if source_user_id = target_user_id then
    raise exception 'Source and target users must be different.';
  end if;

  select coalesce(u.is_anonymous, false)
  into source_is_anonymous
  from auth.users as u
  where u.id = source_user_id;

  if not found then
    raise exception 'Source user does not exist.';
  end if;

  if not source_is_anonymous then
    raise exception 'Source user must be anonymous.';
  end if;

  select coalesce(u.is_anonymous, false)
  into target_is_anonymous
  from auth.users as u
  where u.id = target_user_id;

  if not found then
    raise exception 'Target user does not exist.';
  end if;

  if target_is_anonymous then
    raise exception 'Target user must be persistent.';
  end if;

  update public.conversations
  set
    user_id = target_user_id,
    updated_at = now()
  where user_id = source_user_id;
  get diagnostics conversation_count = row_count;

  update public.messages
  set user_id = target_user_id
  where user_id = source_user_id;
  get diagnostics message_count = row_count;

  update public.memories
  set
    user_id = target_user_id,
    updated_at = now()
  where user_id = source_user_id;
  get diagnostics memory_count = row_count;

  update public.knowledge_documents as kd
  set
    user_id = target_user_id,
    storage_path = coalesce(
      storage_path_map ->> kd.id::text,
      kd.storage_path
    ),
    updated_at = now()
  where kd.user_id = source_user_id;
  get diagnostics document_count = row_count;

  update public.knowledge_chunks
  set user_id = target_user_id
  where user_id = source_user_id;
  get diagnostics chunk_count = row_count;

  return jsonb_build_object(
    'conversations', conversation_count,
    'messages', message_count,
    'memories', memory_count,
    'knowledgeDocuments', document_count,
    'knowledgeChunks', chunk_count
  );
end;
$$;

revoke all
on function public.merge_anonymous_account_data(uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute
on function public.merge_anonymous_account_data(uuid, uuid, jsonb)
to service_role;

create or replace function public.delete_nara_account_data(
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  conversation_count integer := 0;
  message_count integer := 0;
  memory_count integer := 0;
  document_count integer := 0;
  chunk_count integer := 0;
begin
  if target_user_id is null then
    raise exception 'Target user ID is required.';
  end if;

  delete from public.knowledge_chunks
  where user_id = target_user_id;
  get diagnostics chunk_count = row_count;

  delete from public.knowledge_documents
  where user_id = target_user_id;
  get diagnostics document_count = row_count;

  delete from public.messages
  where user_id = target_user_id;
  get diagnostics message_count = row_count;

  delete from public.conversations
  where user_id = target_user_id;
  get diagnostics conversation_count = row_count;

  delete from public.memories
  where user_id = target_user_id;
  get diagnostics memory_count = row_count;

  return jsonb_build_object(
    'conversations', conversation_count,
    'messages', message_count,
    'memories', memory_count,
    'knowledgeDocuments', document_count,
    'knowledgeChunks', chunk_count
  );
end;
$$;

revoke all
on function public.delete_nara_account_data(uuid)
from public, anon, authenticated;

grant execute
on function public.delete_nara_account_data(uuid)
to service_role;
