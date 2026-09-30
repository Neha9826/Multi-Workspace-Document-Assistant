-- ============================================================
-- TOOL CALL LOG
-- Multi-Workspace Document Assistant
-- ============================================================

create table if not exists public.tool_call_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  conversation_id uuid null references public.chat_conversations(id) on delete set null,
  message_id uuid null references public.chat_messages(id) on delete set null,

  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb null,

  success boolean not null default false,
  error text null,

  created_at timestamptz not null default now(),

  constraint tool_call_logs_tool_name_not_empty
    check (length(trim(tool_name)) > 0)
);

create index if not exists tool_call_logs_workspace_created_at_idx
  on public.tool_call_logs (workspace_id, created_at desc);

create index if not exists tool_call_logs_user_created_at_idx
  on public.tool_call_logs (user_id, created_at desc);

create index if not exists tool_call_logs_conversation_idx
  on public.tool_call_logs (conversation_id, created_at desc);

create index if not exists tool_call_logs_tool_name_idx
  on public.tool_call_logs (tool_name);

alter table public.tool_call_logs enable row level security;

drop policy if exists "Users can view their workspace tool logs"
on public.tool_call_logs;

create policy "Users can view their workspace tool logs"
on public.tool_call_logs
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces w
    where w.id = tool_call_logs.workspace_id
      and w.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert their workspace tool logs"
on public.tool_call_logs;

create policy "Users can insert their workspace tool logs"
on public.tool_call_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces w
    where w.id = tool_call_logs.workspace_id
      and w.owner_id = auth.uid()
  )
);

-- No UPDATE or DELETE policies:
-- tool-call logs remain an audit trail.

grant select, insert
on public.tool_call_logs
to authenticated;