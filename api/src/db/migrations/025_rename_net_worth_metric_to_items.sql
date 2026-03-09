-- src/db/migrations/025_rename_net_worth_metric_to_items.sql
-- Renames legacy achievements metric key to the new net_worth_items key.

update achievements_catalog
set metric = 'net_worth_items',
    updated_at = now()
where metric = 'net_worth_total';
