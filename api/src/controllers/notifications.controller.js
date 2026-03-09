import asyncHandler from "../middleware/async.js";
import {
  createNotification,
  getNotificationById,
  dismissNotificationForUser,
  listActiveNotificationsForUser,
  listNotificationHistory,
  updateNotificationById,
} from "../models/notification.model.js";
import { listUsersWithNotificationEmailEnabled } from "../models/user.model.js";
import { sendEmail } from "../services/email.service.js";
import { logActivity } from "../services/activity.service.js";

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
  await logActivity({
    userId: req.user.id,
    action: "notification_dismiss",
    entityType: "notification",
    entityId: id,
    metadata: {},
    req,
  });
  return res.json({ ok: true });
});

export const listAdmin = asyncHandler(async (req, res) => {
  const rawType = String(req.query?.type || "").trim().toLowerCase();
  const type = normalizeNotificationType(rawType);
  const activeRaw = String(req.query?.active || "").trim().toLowerCase();
  const isActive = activeRaw === "true" ? true : activeRaw === "false" ? false : null;

  const notifications = await listNotificationHistory({
    limit: 200,
    notificationType: type || "",
    isActive,
  });
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

export const updateAdmin = asyncHandler(async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "Notification id is required" });

  const hasHtml = req.body?.messageHtml !== undefined;
  const hasType = req.body?.notificationType !== undefined;
  const hasActive = req.body?.isActive !== undefined;
  if (!hasHtml && !hasType && !hasActive) {
    return res.status(400).json({ message: "No notification updates provided" });
  }

  let html = null;
  let text = null;
  if (hasHtml) {
    html = sanitizeNotificationHtml(String(req.body?.messageHtml || "").trim());
    text = stripHtmlToText(html);
    if (!html || !text) {
      return res.status(400).json({ message: "Notification text is required" });
    }
  }

  let notificationType = null;
  if (hasType) {
    notificationType = normalizeNotificationType(req.body?.notificationType);
    if (!notificationType) {
      return res
        .status(400)
        .json({ message: "notificationType must be one of: security, general, updates" });
    }
  }

  let isActive = null;
  if (hasActive) {
    isActive = Boolean(req.body?.isActive);
  }

  const notification = await updateNotificationById(id, {
    messageHtml: html,
    messageText: text,
    notificationType,
    isActive,
  });
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.json({ notification });
});

export const resendAdmin = asyncHandler(async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "Notification id is required" });

  const notification = await getNotificationById(id);
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }
  if (!notification.is_active) {
    return res.status(400).json({ message: "Cannot resend an inactive notification" });
  }

  const recipients = await listUsersWithNotificationEmailEnabled();
  const subject = notification.notification_type === "security"
    ? "<AppName> Security Notification"
    : "<AppName> Notification";
  const text = String(notification.message_text || "").trim();

  const outcomes = await Promise.allSettled(
    recipients.map((user) =>
      sendEmail({
        to: user.email,
        subject,
        text: `${text}\n\nThis message was sent from <AppName>.`,
      })
    )
  );

  const sent = outcomes.filter((o) => o.status === "fulfilled").length;
  const failed = outcomes.length - sent;
  res.json({ sent, failed });
});
