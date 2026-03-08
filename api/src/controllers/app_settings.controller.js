// src/controllers/app_settings.controller.js
import asyncHandler from "../middleware/async.js";
import { getAppSettings, updateAppSettings } from "../models/app_settings.model.js";
import { logActivity } from "../services/activity.service.js";
import {
  sanitizeAchievementsCatalog,
} from "../services/achievements.service.js";
import { ACHIEVEMENT_METRICS } from "../constants/achievements.js";

export const getPublic = asyncHandler(async (_req, res) => {
  const settings = await getAppSettings();
  res.json({ appName: settings?.app_name || "<AppName>" });
});

export const getAdmin = asyncHandler(async (_req, res) => {
  const settings = await getAppSettings();
  if (settings) {
    settings.achievements_catalog = sanitizeAchievementsCatalog(settings.achievements_catalog);
  }
  res.json({ settings });
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const { appName, receiptKeepFiles, achievementsCatalog } = req.body;
  const hasAppName = appName !== undefined;
  const hasReceiptKeepFiles = receiptKeepFiles !== undefined;
  const hasAchievementsCatalog = achievementsCatalog !== undefined;

  if (!hasAppName && !hasReceiptKeepFiles && !hasAchievementsCatalog) {
    return res.status(400).json({ message: "At least one setting is required" });
  }

  if (hasAppName && !String(appName).trim()) {
    return res.status(400).json({ message: "appName must be a non-empty string" });
  }

  if (hasReceiptKeepFiles && typeof receiptKeepFiles !== "boolean") {
    return res.status(400).json({ message: "receiptKeepFiles must be a boolean" });
  }

  let normalizedCatalog = null;
  if (hasAchievementsCatalog) {
    if (!Array.isArray(achievementsCatalog)) {
      return res.status(400).json({
        message:
          "achievementsCatalog must be an array of {key, title, description, icon, metric, target}",
      });
    }
    normalizedCatalog = sanitizeAchievementsCatalog(achievementsCatalog);
    if (!normalizedCatalog.length) {
      return res.status(400).json({
        message: "achievementsCatalog must include at least one valid achievement",
      });
    }
  }

  const updated = await updateAppSettings({
    appName: hasAppName ? String(appName).trim() : null,
    receiptKeepFiles: hasReceiptKeepFiles ? receiptKeepFiles : null,
    achievementsCatalog: hasAchievementsCatalog ? normalizedCatalog : null,
    updatedBy: req.user.id,
  });

  await logActivity({
    userId: req.user.id,
    action: "app_settings_update",
    entityType: "app_settings",
    entityId: updated?.id || null,
    metadata: {
      appName: updated?.app_name,
      receiptKeepFiles: updated?.receipt_keep_files,
      achievementsCatalogCount: Array.isArray(updated?.achievements_catalog)
        ? updated.achievements_catalog.length
        : null,
      achievementMetrics: ACHIEVEMENT_METRICS,
    },
    req,
  });

  res.json({ settings: updated });
});
