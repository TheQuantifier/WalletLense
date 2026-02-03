// src/services/activity.service.js
import { createActivity } from "../models/activity.model.js";

export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  metadata,
  req,
}) {
  if (!userId || !action) return null;

  const ipAddress =
    req?.headers?.["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req?.ip ||
    null;
  const userAgent = req?.get?.("user-agent") || req?.headers?.["user-agent"] || null;

  try {
    return await createActivity({
      userId,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.warn("Activity log failed:", err?.message || err);
    return null;
  }
}
