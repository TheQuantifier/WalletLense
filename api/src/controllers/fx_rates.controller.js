// src/controllers/fx_rates.controller.js
import asyncHandler from "../middleware/async.js";
import { getFxRates } from "../services/fx_rates.service.js";

export const getLatest = asyncHandler(async (req, res) => {
  const base = req.query.base;
  const row = await getFxRates({ base });

  res.json({
    base: row.base_currency,
    provider: row.provider,
    date: row.as_of_date,
    fetchedAt: row.fetched_at,
    rates: row.rates,
  });
});
