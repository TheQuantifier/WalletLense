-- src/db/migrations/021_add_app_settings_achievements_catalog.sql
-- Adds configurable achievements catalog for admin management

alter table app_settings
  add column if not exists achievements_catalog jsonb not null default '[]'::jsonb;
