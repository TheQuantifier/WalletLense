import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUpcomingOccurrences,
  getNextOccurrenceDate,
  getOccurrenceDatesInRange,
  validateRecurringPayload,
} from "../services/recurring.service.js";

test("weekly recurrence supports multiple weekdays", () => {
  const schedule = {
    frequency: "weekly",
    recurrenceValues: [1, 3],
    startDate: "2026-03-01",
    active: true,
  };

  assert.deepEqual(
    getOccurrenceDatesInRange(schedule, {
      from: "2026-03-01",
      to: "2026-03-15",
    }),
    ["2026-03-02", "2026-03-04", "2026-03-09", "2026-03-11"]
  );
});

test("monthly recurrence supports multiple month days with month-end clamp", () => {
  const schedule = {
    frequency: "monthly",
    recurrenceValues: [15, 31],
    startDate: "2026-01-01",
    active: true,
  };

  assert.deepEqual(
    getOccurrenceDatesInRange(schedule, {
      from: "2026-01-01",
      to: "2026-04-30",
    }),
    [
      "2026-01-15",
      "2026-01-31",
      "2026-02-15",
      "2026-02-28",
      "2026-03-15",
      "2026-03-31",
      "2026-04-15",
      "2026-04-30",
    ]
  );
});

test("monthly recurrence falls back day-by-day for 28 through 31 when month is shorter", () => {
  const schedule = {
    frequency: "monthly",
    recurrenceValues: [28, 29, 30, 31],
    startDate: "2026-01-01",
    active: true,
  };

  assert.deepEqual(
    getOccurrenceDatesInRange(schedule, {
      from: "2026-02-01",
      to: "2026-02-28",
    }),
    ["2026-02-28"]
  );
});

test("yearly recurrence supports multiple dates with leap-day fallback", () => {
  const schedule = {
    frequency: "yearly",
    recurrenceValues: ["02-29", "09-15"],
    startDate: "2024-01-01",
    active: true,
  };

  assert.equal(getNextOccurrenceDate(schedule, { from: "2025-01-01" }), "2025-02-28");
  assert.equal(getNextOccurrenceDate(schedule, { from: "2025-03-01" }), "2025-09-15");
});

test("validation rejects unsupported frequency choices", () => {
  const message = validateRecurringPayload({
    name: "Legacy",
    type: "expense",
    amount: 10,
    category: "Other",
    frequency: "biweekly",
    recurrenceValues: [],
    startDate: "2026-01-01",
    endDate: null,
    active: true,
  });

  assert.equal(message, "Frequency must be weekly, monthly, or yearly");
});

test("upcoming occurrences flatten and sort multi-value schedules", () => {
  const rows = [
    {
      id: "a",
      name: "Paycheck",
      type: "income",
      amount: "1200.00",
      category: "Salary / Wages",
      note: "",
      frequency: "weekly",
      recurrence_values: [1, 3],
      day_of_month: null,
      start_date: "2026-03-01",
      end_date: null,
      active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "b",
      name: "Rent",
      type: "expense",
      amount: "1000.00",
      category: "Housing",
      note: "",
      frequency: "monthly",
      recurrence_values: [5],
      day_of_month: 5,
      start_date: "2026-01-05",
      end_date: null,
      active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  const items = buildUpcomingOccurrences(rows, {
    from: "2026-03-01",
    to: "2026-03-15",
    limit: 10,
  });

  assert.deepEqual(
    items.map((item) => `${item.date}:${item.name}`),
    [
      "2026-03-02:Paycheck",
      "2026-03-04:Paycheck",
      "2026-03-05:Rent",
      "2026-03-09:Paycheck",
      "2026-03-11:Paycheck",
    ]
  );
});
