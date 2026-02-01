-- src/db/migrations/008_add_user_avatar.sql
-- Adds avatar URL to users

alter table users
  add column if not exists avatar_url text not null default '';
