// src/services/email.service.js
import nodemailer from "nodemailer";

import env from "../config/env.js";

const hasSmtpConfig =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_PORT &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS;

const hasBrevoApiKey = !!process.env.BREVO_API_KEY;

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (hasSmtpConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback: log emails to the console (no SMTP configured)
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });

  return transporter;
}

export async function sendEmail({ to, subject, text, replyTo, from }) {
  const resolvedFrom = from || process.env.EMAIL_FROM || "no-reply@wisewallet.local";

  if (hasBrevoApiKey) {
    await sendViaBrevoApi({
      to,
      subject,
      text,
      replyTo,
      from: resolvedFrom,
    });
    return;
  }

  const transport = getTransporter();

  let info;
  try {
    info = await transport.sendMail({
      from: resolvedFrom,
      to,
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
  } catch (err) {
    console.error("EMAIL SEND ERROR:", err);
    const error = new Error("Email delivery failed. Check SMTP settings.");
    error.status = 502;
    throw error;
  }

  if (!hasSmtpConfig && info?.message) {
    console.log("EMAIL (dev):\n" + info.message.toString());
  }
}

function parseSender(fromValue) {
  const defaultName = "WiseWallet Support";
  if (!fromValue) return { name: defaultName, email: "no-reply@wisewallet.local" };

  const match = String(fromValue).match(/^\s*\"?([^"]*)\"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1]?.trim() || defaultName;
    const email = match[2]?.trim() || "";
    return { name, email };
  }

  return { name: defaultName, email: String(fromValue).trim() };
}

async function sendViaBrevoApi({ to, subject, text, replyTo, from }) {
  const apiKey = process.env.BREVO_API_KEY;
  const apiUrl = process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";
  const sender = parseSender(from);

  const payload = {
    sender,
    to: [{ email: to }],
    subject,
    textContent: text,
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("BREVO API ERROR:", res.status, text);
      const error = new Error("Email delivery failed. Check SMTP settings.");
      error.status = 502;
      throw error;
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      console.error("BREVO API ERROR: timeout");
      const error = new Error("Email delivery failed. Check SMTP settings.");
      error.status = 502;
      throw error;
    }
    console.error("BREVO API ERROR:", err);
    const error = new Error("Email delivery failed. Check SMTP settings.");
    error.status = 502;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
