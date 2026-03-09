import asyncHandler from "../middleware/async.js";
import {
  createNotification,
  dismissNotificationForUser,
  listActiveNotificationsForUser,
  listNotificationHistory,
} from "../models/notification.model.js";

function sanitizeNotificationHtml(rawHtml) {
  const raw = String(rawHtml || "");
  const noScript = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  const noEventHandlers = noScript.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  const noJsUrls = noEventHandlers.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  return noJsUrls.trim();
}

function stripHtmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeNotificationType(rawType) {
  const value = String(rawType || "general").trim().toLowerCase();
  if (value === "security" || value === "general" || value === "updates") {
    return value;
  }
  return "";
}

export const getMine = asyncHandler(async (req, res) => {
  const notifications = await listActiveNotificationsForUser(req.user.id, 20);
  res.json({ notifications });
});

export const dismissMine = asyncHandler(async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) {
    return res.status(400).json({ message: "Notification id is required" });
  }
  await dismissNotificationForUser(req.user.id, id);
  return res.json({ ok: true });
});

export const listAdmin = asyncHandler(async (_req, res) => {
  const notifications = await listNotificationHistory(200);
  res.json({ notifications });
});

export const createAdmin = asyncHandler(async (req, res) => {
  const rawHtml = String(req.body?.messageHtml || "").trim();
  const notificationType = normalizeNotificationType(req.body?.notificationType);
  const html = sanitizeNotificationHtml(rawHtml);
  const text = stripHtmlToText(html);
  if (!html || !text) {
    return res.status(400).json({ message: "Notification text is required" });
  }
  if (!notificationType) {
    return res
      .status(400)
      .json({ message: "notificationType must be one of: security, general, updates" });
  }

  const notification = await createNotification({
    messageHtml: html,
    messageText: text,
    notificationType,
    createdBy: req.user.id,
  });
  res.status(201).json({
    notification,
    emailDelivery: "queued_for_weekly_monday",
  });
});
