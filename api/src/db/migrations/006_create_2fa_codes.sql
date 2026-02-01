-- src/db/migrations/006_create_2fa_codes.sql
-- Stores short-lived 2FA codes (hashed)

create table if not exists user_2fa_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_2fa_codes_user_id on user_2fa_codes (user_id);
create index if not exists idx_user_2fa_codes_expires on user_2fa_codes (expires_at);
