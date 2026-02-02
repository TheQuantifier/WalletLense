// src/models/fx_rates.model.js
import { query } from "../config/db.js";

export async function getFxRatesByBase(baseCurrency) {
  const { rows } = await query(
    `
    SELECT *
    FROM fx_rates
    WHERE base_currency = $1
    LIMIT 1
    `,
    [baseCurrency]
  );
  return rows[0] || null;
}

export async function upsertFxRates({
  baseCurrency,
  provider,
  rates,
  asOfDate,
  fetchedAt,
}) {
  const { rows } = await query(
    `
    INSERT INTO fx_rates
      (base_currency, provider, rates, as_of_date, fetched_at)
    VALUES
      ($1, $2, $3, $4, $5)
    ON CONFLICT (base_currency)
    DO UPDATE SET
      provider = EXCLUDED.provider,
      rates = EXCLUDED.rates,
      as_of_date = EXCLUDED.as_of_date,
      fetched_at = EXCLUDED.fetched_at,
      updated_at = now()
    RETURNING *
    `,
    [baseCurrency, provider, rates, asOfDate, fetchedAt]
  );

  return rows[0];
}
