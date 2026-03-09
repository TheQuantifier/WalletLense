-- src/db/migrations/029_add_notification_type.sql
-- Adds explicit type for notifications.

alter table notifications
  add column if not exists notification_type text not null default 'general';

update notifications
set notification_type = 'general'
where notification_type is null
   or trim(notification_type) = '';

alter table notifications
  drop constraint if exists notifications_notification_type_check;

alter table notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('security', 'general', 'updates'));
