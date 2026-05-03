create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_message text not null,
  assistant_response text not null,
  model text not null,
  latency_ms integer,
  created_at timestamp with time zone default now()
);

create index if not exists chat_logs_session_id_idx on chat_logs(session_id);
create index if not exists chat_logs_created_at_idx on chat_logs(created_at desc);

-- RLS: only service role can read/write. No client access.
alter table chat_logs enable row level security;
-- (No policies = no access for anon or authenticated roles. Service role bypasses RLS.)
