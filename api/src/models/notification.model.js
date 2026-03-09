import { query } from "../config/db.js";

export async function createNotification({
  messageHtml,
  messageText,
  notificationType = "general",
  createdBy,
}) {
  const { rows } = await query(
    `
    INSERT INTO notifications (
      message_html,
      message_text,
      notification_type,
      created_by
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      message_html,
      message_text,
      notification_type,
      is_active,
      created_by,
      created_at
    `,
    [messageHtml, messageText, notificationType, createdBy || null]
  );
  return rows[0] || null;
}

export async function listNotificationHistory(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const { rows } = await query(
    `
    SELECT
      n.id,
      n.message_html,
      n.message_text,
      n.notification_type,
      n.is_active,
      n.created_by,
      n.created_at,
      u.username as created_by_username
    FROM notifications n
    LEFT JOIN users u ON u.id = n.created_by
    ORDER BY n.created_at DESC
    LIMIT $1
    `,
    [safeLimit]
  );
  return rows || [];
}

export async function listActiveNotificationsForUser(userId, limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const { rows } = await query(
    `
    SELECT
      n.id,
      n.message_html,
      n.message_text,
      n.notification_type,
      n.created_at
    FROM notifications n
    LEFT JOIN user_notification_dismissals d
      ON d.notification_id = n.id
     AND d.user_id = $1
    WHERE n.is_active = true
      AND d.notification_id IS NULL
    ORDER BY n.created_at ASC
    LIMIT $2
    `,
    [userId, safeLimit]
  );
  return rows || [];
}

export async function dismissNotificationForUser(userId, notificationId) {
  const { rows } = await query(
    `
    INSERT INTO user_notification_dismissals (user_id, notification_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, notification_id) DO UPDATE
    SET dismissed_at = now()
    RETURNING user_id, notification_id, dismissed_at
    `,
    [userId, notificationId]
  );
  return rows[0] || null;
}

export async function listPendingWeeklyNotificationsForUser(userId, limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const { rows } = await query(
    `
    SELECT
      n.id,
      n.message_html,
      n.message_text,
      n.notification_type,
      n.created_at
    FROM notifications n
    LEFT JOIN user_notification_dismissals d
      ON d.notification_id = n.id
     AND d.user_id = $1
    LEFT JOIN user_notification_email_deliveries e
      ON e.notification_id = n.id
     AND e.user_id = $1
    WHERE n.is_active = true
      AND d.notification_id IS NULL
      AND e.notification_id IS NULL
    ORDER BY n.created_at ASC
    LIMIT $2
    `,
    [userId, safeLimit]
  );
  return rows || [];
}

export async function markNotificationEmailDelivered(userId, notificationId) {
  const { rows } = await query(
    `
    INSERT INTO user_notification_email_deliveries (
      user_id,
      notification_id
    )
    VALUES ($1, $2)
    ON CONFLICT (user_id, notification_id) DO NOTHING
    RETURNING user_id, notification_id, delivered_at
    `,
    [userId, notificationId]
  );
  return rows[0] || null;
}
