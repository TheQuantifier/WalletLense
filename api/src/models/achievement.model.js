import { query } from "../config/db.js";

export async function listUnlockedAchievementsForUser(userId) {
  const { rows } = await query(
    `
    SELECT achievement_key, unlocked_at
    FROM user_achievements
    WHERE user_id = $1
    ORDER BY unlocked_at ASC
    `,
    [userId]
  );
  return rows;
}

export async function unlockAchievementsForUser(userId, keys = []) {
  const safeKeys = Array.from(new Set((keys || []).map((key) => String(key || "").trim()))).filter(
    Boolean
  );
  if (!safeKeys.length) return [];

  const values = [];
  const placeholders = safeKeys
    .map((key, idx) => {
      values.push(userId, key);
      const base = idx * 2;
      return `($${base + 1}, $${base + 2})`;
    })
    .join(", ");

  const { rows } = await query(
    `
    INSERT INTO user_achievements (user_id, achievement_key)
    VALUES ${placeholders}
    ON CONFLICT (user_id, achievement_key) DO NOTHING
    RETURNING achievement_key, unlocked_at
    `,
    values
  );

  return rows;
}
