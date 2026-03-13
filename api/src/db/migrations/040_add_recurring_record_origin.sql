alter table recurring_schedules
  drop constraint if exists recurring_schedules_frequency_check;

alter table recurring_schedules
  add constraint recurring_schedules_frequency_check
  check (frequency in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'));

alter table records
  add column if not exists origin text;

update records
set origin = case
  when linked_receipt_id is not null then 'receipt'
  else 'manual'
end
where origin is null;

alter table records
  alter column origin set default 'manual';

alter table records
  alter column origin set not null;

alter table records
  drop constraint if exists records_origin_check;

alter table records
  add constraint records_origin_check
  check (origin in ('manual', 'receipt', 'recurring'));

alter table records
  add column if not exists linked_recurring_id uuid null references recurring_schedules(id) on delete set null;

create unique index if not exists idx_records_user_recurring_date
  on records (user_id, linked_recurring_id, date)
  where linked_recurring_id is not null;
