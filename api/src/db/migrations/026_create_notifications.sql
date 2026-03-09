-- src/db/migrations/026_create_notifications.sql
-- Global notifications catalog + per-user dismiss state.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  message_html text not null,
  message_text text not null,
  is_active boolean not null default true,
  created_by uuid null references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists user_notification_dismissals (
  user_id uuid not null references users(id) on delete cascade,
  notification_id uuid not null references notifications(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index if not exists idx_notifications_active_created
  on notifications (is_active, created_at desc);

create index if not exists idx_user_notification_dismissals_user
  on user_notification_dismissals (user_id, dismissed_at desc);
