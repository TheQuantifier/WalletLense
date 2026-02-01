// src/models/twofa.model.js
import { query } from "../config/db.js";

export async function clearTwoFaCodes(userId, purpose) {
  await query(
    `
    DELETE FROM user_2fa_codes
    WHERE user_id = $1 AND purpose = $2
    `,
    [userId, purpose]
  );
}

export async function createTwoFaCode({ userId, purpose, codeHash, expiresAt }) {
  const { rows } = await query(
    `
    INSERT INTO user_2fa_codes
      (user_id, purpose, code_hash, expires_at)
    VALUES
      ($1, $2, $3, $4)
    RETURNING id, user_id, purpose, expires_at
    `,
    [userId, purpose, codeHash, expiresAt]
  );
  return rows[0];
}

export async function findValidTwoFaCode({ userId, purpose, codeHash }) {
  const { rows } = await query(
    `
    SELECT id, user_id, purpose, expires_at
    FROM user_2fa_codes
    WHERE user_id = $1
      AND purpose = $2
      AND code_hash = $3
      AND expires_at > now()
    LIMIT 1
    `,
    [userId, purpose, codeHash]
  );
  return rows[0] || null;
}

export async function deleteTwoFaCodeById(id) {
  await query(
    `
    DELETE FROM user_2fa_codes
    WHERE id = $1
    `,
    [id]
  );
}

export async function setTwoFaEnabled(userId, enabled) {
  const { rows } = await query(
    `
    UPDATE users
    SET
      two_fa_enabled = $2,
      two_fa_method = 'email',
      two_fa_confirmed_at = CASE WHEN $2 THEN now() ELSE NULL END,
      updated_at = now()
    WHERE id = $1
    RETURNING
      id, username, email, full_name, location, role, phone_number, bio,
      two_fa_enabled, two_fa_method, two_fa_confirmed_at,
      created_at, updated_at
    `,
    [userId, enabled]
  );
  return rows[0] || null;
}

export async function getTrustedDevice(userId, deviceId) {
  const { rows } = await query(
    `
    SELECT id, user_id, device_id, user_agent, last_verified_at, created_at
    FROM user_trusted_devices
    WHERE user_id = $1 AND device_id = $2
    LIMIT 1
    `,
    [userId, deviceId]
  );
  return rows[0] || null;
}

export async function upsertTrustedDevice({ userId, deviceId, userAgent = "" }) {
  const { rows } = await query(
    `
    INSERT INTO user_trusted_devices (user_id, device_id, user_agent)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, device_id)
    DO UPDATE SET
      user_agent = EXCLUDED.user_agent,
      last_verified_at = now()
    RETURNING id, user_id, device_id, user_agent, last_verified_at, created_at
    `,
    [userId, deviceId, userAgent]
  );
  return rows[0] || null;
}

export async function touchTrustedDevice(userId, deviceId) {
  await query(
    `
    UPDATE user_trusted_devices
    SET last_verified_at = now()
    WHERE user_id = $1 AND device_id = $2
    `,
    [userId, deviceId]
  );
}

export async function clearTrustedDevices(userId) {
  await query(
    `
    DELETE FROM user_trusted_devices
    WHERE user_id = $1
    `,
    [userId]
  );
}
