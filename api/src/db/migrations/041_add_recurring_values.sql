alter table recurring_schedules
  add column if not exists recurrence_values jsonb not null default '[]'::jsonb;

update recurring_schedules
set recurrence_values = case
  when frequency = 'weekly' then jsonb_build_array(extract(dow from start_date)::int)
  when frequency = 'biweekly' then jsonb_build_array(extract(dow from start_date)::int)
  when frequency = 'monthly' then jsonb_build_array(coalesce(day_of_month, extract(day from start_date)::int))
  when frequency = 'quarterly' then jsonb_build_array(coalesce(day_of_month, extract(day from start_date)::int))
  when frequency = 'yearly' then jsonb_build_array(to_char(start_date, 'MM-DD'))
  else '[]'::jsonb
end
where recurrence_values = '[]'::jsonb;
