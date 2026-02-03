// src/controllers/support.controller.js
import asyncHandler from "../middleware/async.js";
import { sendEmail } from "../services/email.service.js";

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support.wisewallet@manuswebworks.org";

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 4000;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export const contactSupport = asyncHandler(async (req, res) => {
  const subject = normalizeString(req.body?.subject);
  const message = normalizeString(req.body?.message);
  const name = normalizeString(req.body?.name);
  const email = normalizeString(req.body?.email);

  if (!subject || !message) {
    return res
      .status(400)
      .json({ message: "Subject and message are required." });
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    return res.status(400).json({
      message: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`,
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    });
  }

  const metaLines = [
    name ? `Name: ${name}` : null,
    email ? `Email: ${email}` : null,
    req.user?.email ? `Account: ${req.user.email}` : null,
    req.user?.id ? `User ID: ${req.user.id}` : null,
    `IP: ${req.ip}`,
    req.get("user-agent") ? `User-Agent: ${req.get("user-agent")}` : null,
    `URL: ${req.get("referer") || "unknown"}`,
  ].filter(Boolean);

  const body = [
    "Support request",
    "----------------",
    ...metaLines,
    "",
    "Message",
    "----------------",
    message,
  ].join("\n");

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[Support] ${subject}`,
    text: body,
  });

  res.json({ ok: true });
});
