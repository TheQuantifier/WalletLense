-- src/db/migrations/004_create_sessions.sql
-- Creates the user_sessions table for device/session tracking

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  user_agent text not null default '',
  ip_address text not null default '',

  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_user_sessions_user_id on user_sessions (user_id);
create index if not exists idx_user_sessions_last_seen on user_sessions (last_seen_at);
create index if not exists idx_user_sessions_revoked on user_sessions (revoked_at);
