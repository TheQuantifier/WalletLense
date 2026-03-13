import { query } from "../config/db.js";
import { listRecurringSchedules } from "../models/recurring.model.js";
import {
  advanceOccurrence,
  formatDateOnly,
  getOccurrenceDatesInRange,
  parseDateOnly,
  serializeRecurringSchedule,
} from "./recurring.service.js";

export async function materializeRecurringRecordsForUser(
  userId,
  { through = formatDateOnly(new Date()) } = {}
) {
  const throughDate = formatDateOnly(through);
  if (!userId || !throughDate) {
    return { createdCount: 0 };
  }

  const schedules = await listRecurringSchedules(userId, { active: true });
  if (!schedules.length) {
    return { createdCount: 0 };
  }

  const { rows: latestRows } = await query(
    `
    SELECT linked_recurring_id, to_char(date::date, 'YYYY-MM-DD') AS latest_date
    FROM (
      SELECT
        linked_recurring_id,
        max(date) AS date
      FROM records
      WHERE user_id = $1 AND linked_recurring_id IS NOT NULL
      GROUP BY linked_recurring_id
    ) latest
    `,
    [userId]
  );

  const latestBySchedule = new Map(
    latestRows.map((row) => [String(row.linked_recurring_id || ""), row.latest_date])
  );

  let createdCount = 0;

  for (const row of schedules) {
    const schedule = serializeRecurringSchedule(row);
    if (!schedule.active) continue;

    let fromDate = schedule.startDate;
    const latestExisting = latestBySchedule.get(String(schedule.id || ""));
    if (latestExisting) {
      const nextDate = advanceOccurrence(parseDateOnly(latestExisting), schedule);
      fromDate = formatDateOnly(nextDate);
    }

    const dates = getOccurrenceDatesInRange(schedule, {
      from: fromDate,
      to: throughDate,
      limit: 1000,
    });

    for (const date of dates) {
      const note = String(schedule.note || "").trim() || String(schedule.name || "").trim();
      const { rowCount } = await query(
        `
        INSERT INTO records (
          user_id,
          type,
          amount,
          category,
          date,
          note,
          linked_receipt_id,
          origin,
          linked_recurring_id
        )
        VALUES ($1, $2, $3, $4, $5::timestamptz, $6, NULL, 'recurring', $7)
        ON CONFLICT (user_id, linked_recurring_id, date)
          WHERE linked_recurring_id IS NOT NULL
        DO NOTHING
        `,
        [userId, schedule.type, schedule.amount, schedule.category, `${date}T12:00:00.000Z`, note, schedule.id]
      );
      createdCount += rowCount || 0;
    }
  }

  return { createdCount };
}
