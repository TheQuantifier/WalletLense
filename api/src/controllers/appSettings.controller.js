// src/controllers/appSettings.controller.js
import asyncHandler from "../middleware/async.js";
import { getAppSettings, updateAppSettings } from "../models/appSettings.model.js";
import { logActivity } from "../services/activity.service.js";

export const getPublic = asyncHandler(async (_req, res) => {
  const settings = await getAppSettings();
  res.json({ appName: settings?.app_name || "WiseWallet" });
});

export const getAdmin = asyncHandler(async (_req, res) => {
  const settings = await getAppSettings();
  res.json({ settings });
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const { appName } = req.body;
  if (!appName || !String(appName).trim()) {
    return res.status(400).json({ message: "appName is required" });
  }

  const updated = await updateAppSettings({
    appName: String(appName).trim(),
    updatedBy: req.user.id,
  });

  await logActivity({
    userId: req.user.id,
    action: "app_settings_update",
    entityType: "app_settings",
    entityId: updated?.id || null,
    metadata: { appName: updated?.app_name },
    req,
  });

  res.json({ settings: updated });
});
