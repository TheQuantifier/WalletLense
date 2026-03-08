import { query } from "../config/db.js";
import { DEFAULT_ACHIEVEMENTS, ACHIEVEMENT_METRICS } from "../constants/achievements.js";
import { getAppSettings } from "../models/app_settings.model.js";
import {
  listUnlockedAchievementsForUser,
  unlockAchievementsForUser,
} from "../models/achievement.model.js";

const METRIC_SET = new Set(ACHIEVEMENT_METRICS);

const normalizeKey = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");

const normalizeAchievement = (raw = {}, index = 0) => {
  const key = normalizeKey(raw.key || `achievement_${index + 1}`);
  const title = String(raw.title || "").trim();
  const description = String(raw.description || "").trim();
  const metric = String(raw.metric || "").trim();
  const icon = String(raw.icon || "🏆").trim() || "🏆";
  const targetNum = Number(raw.target);
  const target = Number.isFinite(targetNum) && targetNum > 0 ? Math.floor(targetNum) : NaN;

  if (!key || !title || !description || !METRIC_SET.has(metric) || !Number.isFinite(target)) {
    return null;
  }

  return {
    key,
    title,
    description,
    icon,
    metric,
    target,
  };
};

export const sanitizeAchievementsCatalog = (catalog) => {
  const source = Array.isArray(catalog) ? catalog : [];
  const output = [];
  const seen = new Set();

  source.forEach((item, idx) => {
    const normalized = normalizeAchievement(item, idx);
    if (!normalized) return;
    if (seen.has(normalized.key)) return;
    seen.add(normalized.key);
    output.push(normalized);
  });

  if (!output.length) {
    return DEFAULT_ACHIEVEMENTS.map((item, idx) => normalizeAchievement(item, idx)).filter(Boolean);
  }

  return output;
};

async function getMetricCounts(userId) {
  const { rows } = await query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM records WHERE user_id = $1) AS records_total,
      (SELECT COUNT(*)::int FROM records WHERE user_id = $1 AND type = 'income') AS records_income,
      (SELECT COUNT(*)::int FROM records WHERE user_id = $1 AND type = 'expense') AS records_expense,
      (SELECT COUNT(*)::int FROM budget_sheets WHERE user_id = $1) AS budgets_total,
      (SELECT COUNT(*)::int FROM net_worth_items WHERE user_id = $1) AS net_worth_total
    `,
    [userId]
  );

  return rows[0] || {};
}

export async function getAchievementCatalog() {
  const settings = await getAppSettings();
  return sanitizeAchievementsCatalog(settings?.achievements_catalog);
}

export async function evaluateAchievementsForUser(userId) {
  const [catalog, metrics, unlockedRows] = await Promise.all([
    getAchievementCatalog(),
    getMetricCounts(userId),
    listUnlockedAchievementsForUser(userId),
  ]);

  const unlockedMap = new Map(
    (unlockedRows || []).map((row) => [String(row.achievement_key), row.unlocked_at])
  );

  const toUnlock = [];
  for (const achievement of catalog) {
    const progress = Number(metrics[achievement.metric] || 0);
    if (progress >= achievement.target && !unlockedMap.has(achievement.key)) {
      toUnlock.push(achievement.key);
    }
  }

  if (toUnlock.length) {
    const inserted = await unlockAchievementsForUser(userId, toUnlock);
    inserted.forEach((row) => {
      unlockedMap.set(String(row.achievement_key), row.unlocked_at);
    });
  }

  const achievements = catalog.map((achievement) => {
    const progress = Number(metrics[achievement.metric] || 0);
    const unlockedAt = unlockedMap.get(achievement.key) || null;

    return {
      ...achievement,
      progress,
      unlocked: Boolean(unlockedAt),
      unlockedAt,
    };
  });

  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  return {
    achievements,
    summary: {
      unlockedCount,
      totalCount: achievements.length,
    },
  };
}

export async function normalizeCatalogForStorage(catalog) {
  return sanitizeAchievementsCatalog(catalog);
}
