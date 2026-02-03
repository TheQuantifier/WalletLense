-- 013_create_activity_log.sql
-- Tracks explicit user actions (login, uploads, edits, changes, logout)

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_user_id on activity_log (user_id);
create index if not exists idx_activity_log_action on activity_log (action);
create index if not exists idx_activity_log_created_at on activity_log (created_at desc);
