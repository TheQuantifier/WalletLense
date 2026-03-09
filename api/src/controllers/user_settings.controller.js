import asyncHandler from "../middleware/async.js";
import {
  getUserNotificationSettings,
  updateUserNotificationSettings,
} from "../models/user.model.js";
import { logActivity } from "../services/activity.service.js";

export const getMine = asyncHandler(async (req, res) => {
  const settings = await getUserNotificationSettings(req.user.id);
  res.json({
    notifEmail: Boolean(settings?.notification_email_enabled),
    notifSMS: Boolean(settings?.notification_sms_enabled),
  });
});

export const updateMine = asyncHandler(async (req, res) => {
  const notifications = req.body?.notifications || {};
  const hasEmail = notifications.email !== undefined;
  const hasSms = notifications.sms !== undefined;
  if (!hasEmail && !hasSms) {
    return res.status(400).json({ message: "notifications.email or notifications.sms is required" });
  }

  const updated = await updateUserNotificationSettings(req.user.id, {
    notificationEmailEnabled: hasEmail ? Boolean(notifications.email) : null,
    notificationSmsEnabled: hasSms ? Boolean(notifications.sms) : null,
  });

  await logActivity({
    userId: req.user.id,
    action: "user_notification_settings_update",
    entityType: "user",
    entityId: req.user.id,
    metadata: {
      notifEmail: Boolean(updated?.notification_email_enabled),
      notifSMS: Boolean(updated?.notification_sms_enabled),
    },
    req,
  });

  res.json({
    notifEmail: Boolean(updated?.notification_email_enabled),
    notifSMS: Boolean(updated?.notification_sms_enabled),
  });
});
