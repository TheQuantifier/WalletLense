-- src/db/migrations/030_create_support_tickets.sql
-- Stores support requests for admin inbox workflow.

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('authenticated', 'public')),
  user_id uuid null references users(id) on delete set null,
  name text not null default '',
  email text not null default '',
  subject text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create index if not exists idx_support_tickets_status_created
  on support_tickets (status, created_at desc);

create index if not exists idx_support_tickets_user_created
  on support_tickets (user_id, created_at desc);
