-- src/db/migrations/031_expand_admin_roles_and_data_safety_settings.sql
-- Adds scoped admin roles and data safety fields.

alter table users
  drop constraint if exists users_role_check;

alter table users
  add constraint users_role_check
  check (role in ('user', 'admin', 'support_admin', 'analyst'));

alter table app_settings
  add column if not exists data_retention_days integer not null default 365,
  add column if not exists backup_status text not null default 'unknown',
  add column if not exists last_backup_at timestamptz null;

alter table app_settings
  add constraint app_settings_data_retention_days_check
  check (data_retention_days between 30 and 3650);

alter table app_settings
  drop constraint if exists app_settings_backup_status_check;

alter table app_settings
  add constraint app_settings_backup_status_check
  check (backup_status in ('unknown', 'healthy', 'warning', 'failed'));
