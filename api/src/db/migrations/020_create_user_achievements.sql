-- src/db/migrations/020_create_user_achievements.sql
-- Stores achievement unlock history per user

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index if not exists idx_user_achievements_user_id
  on user_achievements (user_id, unlocked_at desc);
