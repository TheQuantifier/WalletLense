// src/controllers/support.controller.js
import asyncHandler from "../middleware/async.js";
import { sendEmail } from "../services/email.service.js";

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support.wisewallet@manuswebworks.org";

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_NAME_LENGTH = 120;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export const contactSupport = asyncHandler(async (req, res) => {
  const subject = normalizeString(req.body?.subject);
  const message = normalizeString(req.body?.message);
  const name = normalizeString(req.body?.name);
  const email = normalizeString(req.user?.email);

  if (!email) {
    return res.status(401).json({ message: "You must be logged in to contact support." });
  }

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

  const defaultFrom = process.env.EMAIL_FROM || "no-reply@wisewallet.local";
  const safeFromName = (name || email || "Customer").replace(/"/g, "'");
  const from = email ? `"${safeFromName}" <${defaultFrom}>` : defaultFrom;

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[Support] ${subject}`,
    text: body,
    replyTo: email || undefined,
    from,
  });

  res.json({ ok: true });
});

export const contactSupportPublic = asyncHandler(async (req, res) => {
  const subject = normalizeString(req.body?.subject);
  const message = normalizeString(req.body?.message);
  const name = normalizeString(req.body?.name);
  const email = normalizeString(req.body?.email).toLowerCase();
  const website = normalizeString(req.body?.website); // honeypot

  if (website) {
    return res.status(400).json({ message: "Invalid request." });
  }

  if (!name || !subject || !message || !email) {
    return res.status(400).json({ message: "Name, email, subject, and message are required." });
  }

  if (name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({
      message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address." });
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
    `Name: ${name}`,
    `Email: ${email}`,
    `IP: ${req.ip}`,
    req.get("user-agent") ? `User-Agent: ${req.get("user-agent")}` : null,
    `URL: ${req.get("referer") || "unknown"}`,
  ].filter(Boolean);

  const body = [
    "Public support request",
    "----------------",
    ...metaLines,
    "",
    "Message",
    "----------------",
    message,
  ].join("\n");

  const defaultFrom = process.env.EMAIL_FROM || "no-reply@wisewallet.local";
  const safeFromName = (name || email || "Customer").replace(/"/g, "'");
  const from = `"${safeFromName}" <${defaultFrom}>`;

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[Public Support] ${subject}`,
    text: body,
    replyTo: email,
    from,
  });

  res.json({ ok: true });
});
