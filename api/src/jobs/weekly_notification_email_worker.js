import { listUsersWithNotificationEmailEnabled } from "../models/user.model.js";
import {
  listPendingWeeklyNotificationsForUser,
  markNotificationEmailDelivered,
} from "../models/notification.model.js";
import { sendEmail } from "../services/email.service.js";

let started = false;
let timer = null;
let isRunning = false;

function isMonday(date = new Date()) {
  return date.getDay() === 1;
}

function buildWeeklyDigestText(notifications = []) {
  const lines = ["Here are your latest updates from <AppName>:", ""];
  notifications.forEach((item, idx) => {
    const text = String(item?.message_text || "").trim();
    if (!text) return;
    lines.push(`${idx + 1}. ${text}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

export async function sendWeeklyNotificationEmailsNow() {
  const users = await listUsersWithNotificationEmailEnabled();
  let usersEmailed = 0;
  let usersFailed = 0;
  let notificationsDelivered = 0;

  for (const user of users) {
    const pending = await listPendingWeeklyNotificationsForUser(user.id, 200);
    if (!pending.length) continue;

    try {
      await sendEmail({
        to: user.email,
        subject: "Your weekly <AppName> updates",
        text: buildWeeklyDigestText(pending),
      });
      usersEmailed += 1;

      await Promise.all(
        pending.map((item) => markNotificationEmailDelivered(user.id, item.id))
      );
      notificationsDelivered += pending.length;
    } catch (err) {
      usersFailed += 1;
      console.error(
        `Weekly notification email failed for user ${user.id}:`,
        err?.message || err
      );
    }
  }

  return {
    usersChecked: users.length,
    usersEmailed,
    usersFailed,
    notificationsDelivered,
  };
}

async function workOnce() {
  if (isRunning) return;
  if (!isMonday()) return;

  isRunning = true;
  try {
    const summary = await sendWeeklyNotificationEmailsNow();
    if (summary.notificationsDelivered > 0 || summary.usersFailed > 0) {
      console.log(
        "Weekly notification email run:",
        JSON.stringify(summary)
      );
    }
  } finally {
    isRunning = false;
  }
}

export function startWeeklyNotificationEmailWorker({ intervalMs = 15 * 60 * 1000 } = {}) {
  if (started) return;
  started = true;

  workOnce().catch((err) => {
    console.error("Weekly notification email worker startup error:", err);
  });

  timer = setInterval(() => {
    workOnce().catch((err) => {
      console.error("Weekly notification email worker loop error:", err);
    });
  }, Math.max(60 * 1000, Number(intervalMs) || 15 * 60 * 1000));
}

export function stopWeeklyNotificationEmailWorker() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  started = false;
}
