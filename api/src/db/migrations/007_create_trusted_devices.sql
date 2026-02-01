-- src/db/migrations/007_create_trusted_devices.sql
-- Stores trusted devices for optional 2FA

create table if not exists user_trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_id text not null,
  user_agent text not null default '',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists idx_trusted_devices_user_id on user_trusted_devices (user_id);
create index if not exists idx_trusted_devices_verified on user_trusted_devices (last_verified_at);
