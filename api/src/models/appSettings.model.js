// src/models/appSettings.model.js
import { query } from "../config/db.js";

export async function getAppSettings() {
  const { rows } = await query(
    `
    SELECT id, app_name, updated_by, created_at, updated_at
    FROM app_settings
    ORDER BY created_at ASC
    LIMIT 1
    `
  );
  return rows[0] || null;
}

export async function updateAppSettings({ appName, updatedBy }) {
  const { rows } = await query(
    `
    UPDATE app_settings
    SET app_name = $1,
        updated_by = $2,
        updated_at = now()
    WHERE id = (
      SELECT id FROM app_settings ORDER BY created_at ASC LIMIT 1
    )
    RETURNING id, app_name, updated_by, created_at, updated_at
    `,
    [appName, updatedBy || null]
  );
  return rows[0] || null;
}
