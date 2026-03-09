import { query } from "../config/db.js";

export async function createSupportTicket({
  source = "authenticated",
  userId = null,
  name = "",
  email = "",
  subject,
  message,
}) {
  const { rows } = await query(
    `
    INSERT INTO support_tickets (
      source,
      user_id,
      name,
      email,
      subject,
      message
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [source, userId, name, email, subject, message]
  );
  return rows[0] || null;
}

export async function listSupportTickets({
  status = "",
  queryText = "",
  limit = 100,
  offset = 0,
} = {}) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const params = [];
  const where = [];
  let i = 1;

  if (status) {
    where.push(`t.status = $${i++}`);
    params.push(status);
  }
  if (queryText) {
    where.push(`(
      t.subject ILIKE $${i}
      OR t.message ILIKE $${i}
      OR t.email ILIKE $${i}
      OR t.name ILIKE $${i}
    )`);
    params.push(`%${queryText}%`);
    i += 1;
  }

  params.push(safeLimit, safeOffset);
  const { rows } = await query(
    `
    SELECT
      t.*,
      u.username as user_username,
      u.full_name as user_full_name
    FROM support_tickets t
    LEFT JOIN users u ON u.id = t.user_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY t.created_at DESC
    LIMIT $${i++} OFFSET $${i++}
    `,
    params
  );

  return rows || [];
}

export async function updateSupportTicket(id, { status, adminNote }) {
  const { rows } = await query(
    `
    UPDATE support_tickets
    SET
      status = COALESCE($1, status),
      admin_note = COALESCE($2, admin_note),
      resolved_at = CASE
        WHEN COALESCE($1, status) IN ('resolved', 'closed') THEN now()
        ELSE resolved_at
      END,
      updated_at = now()
    WHERE id = $3
    RETURNING *
    `,
    [status ?? null, adminNote ?? null, id]
  );
  return rows[0] || null;
}
