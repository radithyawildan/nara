alter table public.conversations
  add column if not exists context_summary text;

alter table public.conversations
  add column if not exists context_summary_message_count integer not null default 0;

alter table public.conversations
  add column if not exists context_summary_updated_at timestamptz;

alter table public.conversations
  add column if not exists topic_state jsonb not null default jsonb_build_object(
    'currentTopic', null,
    'lockedDecisions', '[]'::jsonb,
    'openLoops', '[]'::jsonb,
    'userGoals', '[]'::jsonb
  );

alter table public.conversations
  drop constraint if exists conversations_context_summary_message_count_check;

alter table public.conversations
  add constraint conversations_context_summary_message_count_check
  check (context_summary_message_count >= 0);

create index if not exists conversations_context_summary_updated_at_idx
  on public.conversations (user_id, context_summary_updated_at desc)
  where context_summary is not null;
