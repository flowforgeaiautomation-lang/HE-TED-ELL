/*
# Create market_prices table for live market data caching

1. New Tables
- `market_prices`: stores live price data for indices, commodities, forex, and crypto
  - `symbol` (text, primary key)
  - `name` (text)
  - `category` (text)
  - `region` (text)
  - `price` (numeric, nullable)
  - `change` (numeric, nullable)
  - `change_percent` (numeric, nullable)
  - `source` (text, nullable)
  - `updated_at` (timestamptz)
  - `available` (boolean, default true)

2. Security
- Enable RLS on market_prices.
- Allow anon + authenticated full CRUD (public market data).
*/

CREATE TABLE IF NOT EXISTS market_prices (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'indices',
  region text,
  price numeric,
  change numeric,
  change_percent numeric,
  source text,
  updated_at timestamptz DEFAULT now(),
  available boolean NOT NULL DEFAULT true
);

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_market_prices" ON market_prices;
CREATE POLICY "anon_read_market_prices" ON market_prices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_market_prices" ON market_prices;
CREATE POLICY "anon_insert_market_prices" ON market_prices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_market_prices" ON market_prices;
CREATE POLICY "anon_update_market_prices" ON market_prices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_market_prices" ON market_prices;
CREATE POLICY "anon_delete_market_prices" ON market_prices FOR DELETE
  TO anon, authenticated USING (true);