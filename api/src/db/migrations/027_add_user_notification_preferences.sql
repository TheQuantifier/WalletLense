-- src/db/migrations/027_add_user_notification_preferences.sql
-- Stores per-user notification delivery preferences.

alter table users
  add column if not exists notification_email_enabled boolean not null default false;

alter table users
  add column if not exists notification_sms_enabled boolean not null default false;
