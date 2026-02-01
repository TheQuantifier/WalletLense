// src/services/email.service.js
import nodemailer from "nodemailer";

import env from "../config/env.js";

const hasSmtpConfig =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_PORT &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS;

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

export async function sendEmail({ to, subject, text }) {
  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || "no-reply@wisewallet.local";

  const info = await transport.sendMail({
    from,
    to,
    subject,
    text,
  });

  if (!hasSmtpConfig && info?.message) {
    console.log("EMAIL (dev):\n" + info.message.toString());
  }
}
