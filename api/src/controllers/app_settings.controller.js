// src/controllers/app_settings.controller.js
import asyncHandler from "../middleware/async.js";
import { getAppSettings, updateAppSettings } from "../models/app_settings.model.js";
import {
  listAchievementsCatalog,
  replaceAchievementsCatalog,
} from "../models/achievements_catalog.model.js";
import { logActivity } from "../services/activity.service.js";
import {
  sanitizeAchievementsCatalog,
} from "../services/achievements.service.js";
import { ACHIEVEMENT_METRICS } from "../constants/achievements.js";

export const getPublic = asyncHandler(async (_req, res) => {
  const settings = await getAppSettings();
  const timeout = Number(settings?.session_timeout_minutes);
  res.json({
    appName: settings?.app_name || "<AppName>",
    sessionTimeoutMinutes: Number.isFinite(timeout) ? timeout : 15,
  });
});

export const getAdmin = asyncHandler(async (_req, res) => {
  const settings = await getAppSettings();
  if (settings) {
    const catalogRows = await listAchievementsCatalog();
    settings.achievements_catalog = sanitizeAchievementsCatalog(catalogRows);
  }
  res.json({ settings });
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const {
    appName,
    receiptKeepFiles,
    sessionTimeoutMinutes,
    achievementsCatalog,
    dataRetentionDays,
    backupStatus,
    lastBackupAt,
  } = req.body;
  const hasAppName = appName !== undefined;
  const hasReceiptKeepFiles = receiptKeepFiles !== undefined;
  const hasSessionTimeoutMinutes = sessionTimeoutMinutes !== undefined;
  const hasAchievementsCatalog = achievementsCatalog !== undefined;
  const hasDataRetentionDays = dataRetentionDays !== undefined;
  const hasBackupStatus = backupStatus !== undefined;
  const hasLastBackupAt = lastBackupAt !== undefined;

  if (
    !hasAppName &&
    !hasReceiptKeepFiles &&
    !hasSessionTimeoutMinutes &&
    !hasAchievementsCatalog &&
    !hasDataRetentionDays &&
    !hasBackupStatus &&
    !hasLastBackupAt
  ) {
    return res.status(400).json({ message: "At least one setting is required" });
  }

  if (hasAppName && !String(appName).trim()) {
    return res.status(400).json({ message: "appName must be a non-empty string" });
  }

  if (hasReceiptKeepFiles && typeof receiptKeepFiles !== "boolean") {
    return res.status(400).json({ message: "receiptKeepFiles must be a boolean" });
  }

  if (hasSessionTimeoutMinutes) {
    const timeout = Number(sessionTimeoutMinutes);
    if (!Number.isFinite(timeout) || timeout < 1 || timeout > 60 || !Number.isInteger(timeout)) {
      return res.status(400).json({ message: "sessionTimeoutMinutes must be an integer between 1 and 60" });
    }
  }

  if (hasDataRetentionDays) {
    const days = Number(dataRetentionDays);
    if (!Number.isInteger(days) || days < 30 || days > 3650) {
      return res.status(400).json({ message: "dataRetentionDays must be an integer between 30 and 3650" });
    }
  }

  if (hasBackupStatus) {
    const safeStatus = String(backupStatus).trim().toLowerCase();
    if (!["unknown", "healthy", "warning", "failed"].includes(safeStatus)) {
      return res.status(400).json({ message: "backupStatus must be one of unknown, healthy, warning, failed" });
    }
  }

  if (hasLastBackupAt) {
    const parsed = new Date(String(lastBackupAt));
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "lastBackupAt must be a valid datetime string" });
    }
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

  if (hasAchievementsCatalog) {
    await replaceAchievementsCatalog(normalizedCatalog, req.user.id);
  }

  const needsAppSettingsUpdate =
    hasAppName ||
    hasReceiptKeepFiles ||
    hasSessionTimeoutMinutes ||
    hasDataRetentionDays ||
    hasBackupStatus ||
    hasLastBackupAt;
  const updated = needsAppSettingsUpdate
    ? await updateAppSettings({
        appName: hasAppName ? String(appName).trim() : null,
        receiptKeepFiles: hasReceiptKeepFiles ? receiptKeepFiles : null,
        sessionTimeoutMinutes: hasSessionTimeoutMinutes ? Number(sessionTimeoutMinutes) : null,
        dataRetentionDays: hasDataRetentionDays ? Number(dataRetentionDays) : null,
        backupStatus: hasBackupStatus ? String(backupStatus).trim().toLowerCase() : null,
        lastBackupAt: hasLastBackupAt ? new Date(String(lastBackupAt)).toISOString() : null,
        updatedBy: req.user.id,
      })
    : await getAppSettings();

  const catalogRows = await listAchievementsCatalog();
  const achievementsCatalogSanitized = sanitizeAchievementsCatalog(catalogRows);
  if (updated) {
    updated.achievements_catalog = achievementsCatalogSanitized;
  }

  await logActivity({
    userId: req.user.id,
    action: "app_settings_update",
    entityType: "app_settings",
    entityId: updated?.id || null,
    metadata: {
      appName: updated?.app_name,
      receiptKeepFiles: updated?.receipt_keep_files,
      sessionTimeoutMinutes: updated?.session_timeout_minutes,
      dataRetentionDays: updated?.data_retention_days,
      backupStatus: updated?.backup_status,
      lastBackupAt: updated?.last_backup_at,
      achievementsCatalogCount: Array.isArray(achievementsCatalogSanitized)
        ? achievementsCatalogSanitized.length
        : null,
      achievementMetrics: ACHIEVEMENT_METRICS,
    },
    req,
  });

  res.json({ settings: updated });
});
