-- src/db/migrations/010_create_budget_sheets.sql
-- Creates budget_sheets table

create table if not exists budget_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  cadence text not null check (cadence in ('weekly','biweekly','monthly','quarterly','semi-annually','yearly')),
  period text not null,

  housing numeric(12,2) null,
  utilities numeric(12,2) null,
  groceries numeric(12,2) null,
  transportation numeric(12,2) null,
  dining numeric(12,2) null,
  health numeric(12,2) null,
  entertainment numeric(12,2) null,
  shopping numeric(12,2) null,
  membership numeric(12,2) null,
  miscellaneous numeric(12,2) null,
  education numeric(12,2) null,
  giving numeric(12,2) null,
  savings numeric(12,2) null,

  custom_categories jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_sheets_user_period_unique unique (user_id, cadence, period)
);

create index if not exists idx_budget_sheets_user_id on budget_sheets (user_id);
create index if not exists idx_budget_sheets_cadence_period on budget_sheets (user_id, cadence, period);
