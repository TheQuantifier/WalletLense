import { connectDb, closeDb } from "./config/db.js";
import env from "./config/env.js";
import { runMigrations } from "./db/run_migrations.js";
import { startReceiptJobWorker, stopReceiptJobWorker } from "./jobs/receipt_job_worker.js";
import {
  startWeeklyNotificationEmailWorker,
  stopWeeklyNotificationEmailWorker,
} from "./jobs/weekly_notification_email_worker.js";

const start = async () => {
  try {
    await connectDb();
    if (env.autoRunMigrations) {
      await runMigrations();
    }
    startReceiptJobWorker();
    if (env.runWeeklyNotificationWorkerInApi) {
      startWeeklyNotificationEmailWorker();
    }
    console.log("🚀 Receipt worker started.");
  } catch (err) {
    console.error("❌ Failed to start receipt worker:", err);
    process.exit(1);
  }
};

start();

process.on("SIGINT", async () => {
  console.log("🛑 Worker SIGINT received. Shutting down...");
  stopReceiptJobWorker();
  stopWeeklyNotificationEmailWorker();
  await closeDb();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Worker SIGTERM received. Shutting down...");
  stopReceiptJobWorker();
  stopWeeklyNotificationEmailWorker();
  await closeDb();
  process.exit(0);
});
