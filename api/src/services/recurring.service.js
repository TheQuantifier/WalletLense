const VALID_FREQUENCIES = new Set(["weekly", "monthly", "yearly"]);
const LEGACY_FREQUENCIES = new Set(["biweekly", "quarterly"]);
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = parseDateOnly(value);
  return formatDateOnly(date) === value;
}

export function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date, months, preferredDay) {
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const targetDay = Math.min(
    Number(preferredDay) || date.getUTCDate(),
    daysInMonth(targetYear, targetMonth)
  );
  return new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0));
}

function normalizeWeekdays(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    )
  ).sort((a, b) => a - b);
}

function normalizeMonthDays(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 31)
    )
  ).sort((a, b) => a - b);
}

function normalizeYearDates(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => /^\d{2}-\d{2}$/.test(value))
        .filter((value) => {
          const [month, day] = value.split("-").map(Number);
          return month >= 1 && month <= 12 && day >= 1 && day <= 31;
        })
    )
  ).sort();
}

function getLegacyPreferredDay(schedule, fallbackDate) {
  return (
    Number(schedule?.dayOfMonth ?? schedule?.day_of_month) ||
    fallbackDate?.getUTCDate() ||
    1
  );
}

function getNormalizedValues(schedule, frequency, startDate) {
  const rawValues = Array.isArray(schedule?.recurrenceValues)
    ? schedule.recurrenceValues
    : Array.isArray(schedule?.recurrence_values)
      ? schedule.recurrence_values
      : [];

  if (frequency === "weekly") {
    const values = normalizeWeekdays(rawValues);
    if (values.length) return values;
    return [startDate?.getUTCDay() ?? 0];
  }

  if (frequency === "monthly") {
    const values = normalizeMonthDays(rawValues);
    if (values.length) return values;
    return [getLegacyPreferredDay(schedule, startDate)];
  }

  if (frequency === "yearly") {
    const values = normalizeYearDates(rawValues);
    if (values.length) return values;
    const month = String((startDate?.getUTCMonth() ?? 0) + 1).padStart(2, "0");
    const day = String(getLegacyPreferredDay(schedule, startDate)).padStart(2, "0");
    return [`${month}-${day}`];
  }

  return [];
}

function matchesLegacyOccurrence(date, schedule, frequency, startDate) {
  const preferredDay = getLegacyPreferredDay(schedule, startDate);

  if (frequency === "biweekly") {
    const diffDays = Math.floor((date.getTime() - startDate.getTime()) / 86400000);
    return diffDays >= 0 && diffDays % 14 === 0;
  }

  if (frequency === "quarterly") {
    const monthDiff =
      (date.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (date.getUTCMonth() - startDate.getUTCMonth());
    if (monthDiff < 0 || monthDiff % 3 !== 0) return false;
    return date.getUTCDate() === Math.min(preferredDay, daysInMonth(date.getUTCFullYear(), date.getUTCMonth()));
  }

  return false;
}

function matchesOccurrence(date, schedule) {
  const frequency = String(schedule?.frequency || "").toLowerCase();
  const startDate = parseDateOnly(schedule?.startDate ?? schedule?.start_date);
  const endDate = parseDateOnly(schedule?.endDate ?? schedule?.end_date);

  if (!startDate) return false;
  if (date < startDate) return false;
  if (endDate && date > endDate) return false;

  if (VALID_FREQUENCIES.has(frequency)) {
    const values = getNormalizedValues(schedule, frequency, startDate);

    if (frequency === "weekly") {
      return values.includes(date.getUTCDay());
    }

    if (frequency === "monthly") {
      return values.some((value) => date.getUTCDate() === Math.min(value, daysInMonth(date.getUTCFullYear(), date.getUTCMonth())));
    }

    if (frequency === "yearly") {
      return values.some((value) => {
        const [month, day] = value.split("-").map(Number);
        const actualDay = Math.min(day, daysInMonth(date.getUTCFullYear(), month - 1));
        return date.getUTCMonth() + 1 === month && date.getUTCDate() === actualDay;
      });
    }
  }

  if (LEGACY_FREQUENCIES.has(frequency)) {
    return matchesLegacyOccurrence(date, schedule, frequency, startDate);
  }

  return false;
}

export function advanceOccurrence(date, schedule) {
  const frequency = String(schedule?.frequency || "").toLowerCase();
  if (frequency === "biweekly") return addDays(date, 14);
  if (frequency === "quarterly") {
    return addMonths(date, 3, getLegacyPreferredDay(schedule, date));
  }

  let cursor = addDays(date, 1);
  let guard = 0;
  while (guard < 5000) {
    if (matchesOccurrence(cursor, schedule)) return cursor;
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return null;
}

export function getOccurrenceDatesInRange(schedule, { from, to, limit = 100 } = {}) {
  const frequency = String(schedule?.frequency || "").toLowerCase();
  if (!VALID_FREQUENCIES.has(frequency) && !LEGACY_FREQUENCIES.has(frequency)) return [];

  const startDate = parseDateOnly(schedule?.startDate ?? schedule?.start_date);
  const endDate = parseDateOnly(schedule?.endDate ?? schedule?.end_date);
  const fromDate = parseDateOnly(from || formatDateOnly(new Date()));
  const toDate = parseDateOnly(to || from || formatDateOnly(new Date()));

  if (!startDate || !fromDate || !toDate || startDate > toDate || limit <= 0) return [];

  const dates = [];
  let cursor = fromDate > startDate ? fromDate : startDate;

  while (cursor && cursor <= toDate && dates.length < limit) {
    if ((!endDate || cursor <= endDate) && matchesOccurrence(cursor, schedule)) {
      dates.push(formatDateOnly(cursor));
    }
    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function getNextOccurrenceDate(schedule, { from = formatDateOnly(new Date()) } = {}) {
  const frequency = String(schedule?.frequency || "").toLowerCase();
  if (!VALID_FREQUENCIES.has(frequency) && !LEGACY_FREQUENCIES.has(frequency)) return null;

  const startDate = parseDateOnly(schedule?.startDate ?? schedule?.start_date);
  const endDate = parseDateOnly(schedule?.endDate ?? schedule?.end_date);
  const fromDate = parseDateOnly(from);
  if (!startDate || !fromDate) return null;
  if (endDate && endDate < fromDate) return null;

  let cursor = fromDate > startDate ? fromDate : startDate;
  let guard = 0;

  while (cursor && guard < 5000) {
    if (matchesOccurrence(cursor, schedule)) {
      return formatDateOnly(cursor);
    }
    if (endDate && cursor >= endDate) return null;
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  return null;
}

function normalizeRecurringValues(inputValues, frequency, startDate) {
  if (frequency === "weekly") return getNormalizedValues({ recurrenceValues: inputValues }, frequency, startDate);
  if (frequency === "monthly") return getNormalizedValues({ recurrenceValues: inputValues }, frequency, startDate);
  if (frequency === "yearly") return getNormalizedValues({ recurrenceValues: inputValues }, frequency, startDate);
  return [];
}

export function normalizeRecurringPayload(input = {}, { partial = false } = {}) {
  const out = {};

  if (!partial || input.name !== undefined) out.name = String(input.name || "").trim();
  if (!partial || input.type !== undefined) out.type = String(input.type || "").trim().toLowerCase();
  if (!partial || input.amount !== undefined) out.amount = Number(input.amount);
  if (!partial || input.category !== undefined) out.category = String(input.category || "").trim();
  if (!partial || input.note !== undefined) out.note = String(input.note || "").trim();
  if (!partial || input.frequency !== undefined) {
    out.frequency = String(input.frequency || "").trim().toLowerCase();
  }
  if (!partial || input.dayOfMonth !== undefined || input.day_of_month !== undefined) {
    const raw = input.dayOfMonth ?? input.day_of_month;
    out.dayOfMonth =
      raw === null || raw === "" || raw === undefined ? null : Number.parseInt(String(raw), 10);
  }
  if (!partial || input.recurrenceValues !== undefined || input.recurrence_values !== undefined) {
    const rawValues = input.recurrenceValues ?? input.recurrence_values;
    out.recurrenceValues = Array.isArray(rawValues) ? rawValues : [];
  }
  if (!partial || input.startDate !== undefined || input.start_date !== undefined) {
    out.startDate = String(input.startDate ?? input.start_date ?? "").trim();
  }
  if (!partial || input.endDate !== undefined || input.end_date !== undefined) {
    const raw = input.endDate ?? input.end_date;
    out.endDate = raw === null || raw === "" || raw === undefined ? null : String(raw).trim();
  }
  if (!partial || input.active !== undefined) out.active = Boolean(input.active);

  if (out.frequency && out.startDate && out.recurrenceValues !== undefined) {
    const startDate = parseDateOnly(out.startDate);
    out.recurrenceValues = normalizeRecurringValues(out.recurrenceValues, out.frequency, startDate);
  }

  return out;
}

export function validateRecurringPayload(payload, { partial = false } = {}) {
  if (!partial || payload.name !== undefined) {
    if (!payload.name) return "Name is required";
  }

  if (!partial || payload.type !== undefined) {
    if (!["income", "expense"].includes(payload.type)) return "Type must be income or expense";
  }

  if (!partial || payload.amount !== undefined) {
    if (!Number.isFinite(payload.amount) || payload.amount < 0) {
      return "Amount must be a number greater than or equal to 0";
    }
  }

  if (!partial || payload.category !== undefined) {
    if (!payload.category) return "Category is required";
  }

  const frequency = String(payload.frequency || "").toLowerCase();
  if (!partial || payload.frequency !== undefined) {
    if (!VALID_FREQUENCIES.has(frequency)) {
      return "Frequency must be weekly, monthly, or yearly";
    }
  }

  if (!partial || payload.startDate !== undefined) {
    if (!payload.startDate || !isValidDateOnly(payload.startDate)) {
      return "Start date must use YYYY-MM-DD";
    }
  }

  if (!partial || payload.endDate !== undefined) {
    if (payload.endDate !== null && !isValidDateOnly(payload.endDate)) {
      return "End date must use YYYY-MM-DD";
    }
  }

  const startDate = payload.startDate ? parseDateOnly(payload.startDate) : null;
  const endDate = payload.endDate ? parseDateOnly(payload.endDate) : null;
  if (startDate && endDate && endDate < startDate) {
    return "End date must be on or after start date";
  }

  if (!partial || payload.recurrenceValues !== undefined || payload.frequency !== undefined) {
    const values = normalizeRecurringValues(payload.recurrenceValues || [], frequency, startDate);
    if (!values.length) {
      if (frequency === "weekly") return "Select at least one weekday";
      if (frequency === "monthly") return "Enter at least one day of month";
      if (frequency === "yearly") return "Select at least one yearly date";
    }
  }

  return null;
}

function buildRecurrenceLabel(schedule) {
  const frequency = String(schedule.frequency || "").toLowerCase();
  const values = Array.isArray(schedule.recurrenceValues) ? schedule.recurrenceValues : [];

  if (frequency === "weekly") {
    return values.map((value) => WEEKDAY_LABELS[value] || value).join(", ");
  }

  if (frequency === "monthly") {
    return values.join(", ");
  }

  if (frequency === "yearly") {
    return values.join(", ");
  }

  return "";
}

export function serializeRecurringSchedule(row) {
  const startDate = formatDateOnly(row.start_date);
  const schedule = {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: Number(row.amount || 0),
    category: row.category,
    note: row.note || "",
    frequency: row.frequency,
    dayOfMonth: row.day_of_month,
    recurrenceValues: getNormalizedValues(
      {
        recurrenceValues: row.recurrence_values,
        day_of_month: row.day_of_month,
      },
      row.frequency,
      parseDateOnly(startDate)
    ),
    startDate,
    endDate: formatDateOnly(row.end_date),
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  schedule.recurrenceLabel = buildRecurrenceLabel(schedule);
  schedule.nextRun = schedule.active === false ? null : getNextOccurrenceDate(schedule);

  return schedule;
}

export function buildUpcomingOccurrences(rows, { from, to, limit = 100 } = {}) {
  const items = [];

  rows.forEach((row) => {
    const schedule = serializeRecurringSchedule(row);
    if (!schedule.active) return;

    const dates = getOccurrenceDatesInRange(schedule, { from, to, limit });
    dates.forEach((date) => {
      items.push({
        id: `${schedule.id}:${date}`,
        scheduleId: schedule.id,
        name: schedule.name,
        type: schedule.type,
        amount: schedule.amount,
        category: schedule.category,
        note: schedule.note,
        frequency: schedule.frequency,
        recurrenceValues: schedule.recurrenceValues,
        recurrenceLabel: schedule.recurrenceLabel,
        date,
        nextRun: date,
      });
    });
  });

  items.sort((a, b) => {
    if (a.date === b.date) return a.name.localeCompare(b.name);
    return a.date.localeCompare(b.date);
  });

  return items.slice(0, Math.max(0, limit));
}
