// src/models/activity.model.js
import { query } from "../config/db.js";

export async function createActivity({
  userId,
  action,
  entityType = null,
  entityId = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) {
  const { rows } = await query(
    `
    INSERT INTO activity_log
      (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [userId, action, entityType, entityId, metadata, ipAddress, userAgent]
  );

  return rows[0];
}

export async function listActivityForUser(userId, { limit = 20 } = {}) {
  const { rows } = await query(
    `
    SELECT *
    FROM activity_log
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}
