-- src/db/migrations/028_create_user_notification_email_deliveries.sql
-- Tracks one-time weekly email delivery per user+notification.

create table if not exists user_notification_email_deliveries (
  user_id uuid not null references users(id) on delete cascade,
  notification_id uuid not null references notifications(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index if not exists idx_user_notification_email_deliveries_user
  on user_notification_email_deliveries (user_id, delivered_at desc);
