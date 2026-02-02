-- 012_create_fx_rates.sql
-- Shared FX rates cache (daily refresh)

CREATE TABLE IF NOT EXISTS fx_rates (
  base_currency TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'ratesdb',
  rates JSONB NOT NULL,
  as_of_date DATE NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
