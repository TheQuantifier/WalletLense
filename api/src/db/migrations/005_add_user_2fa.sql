-- src/db/migrations/005_add_user_2fa.sql
-- Adds optional 2FA fields to users

alter table users
  add column if not exists two_fa_enabled boolean not null default false,
  add column if not exists two_fa_method text not null default 'email',
  add column if not exists two_fa_confirmed_at timestamptz;
