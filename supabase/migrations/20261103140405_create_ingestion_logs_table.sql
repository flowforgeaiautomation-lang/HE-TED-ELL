/*
# Create ingestion monitoring table

1. New Tables
- `ingestion_logs` — tracks every edge function ingestion run with status, counts, errors, and timing
  - id (uuid, PK)
  - run_id (text, unique identifier per run)
  - status (text: 'running', 'success', 'failed', 'partial')
  - fetched_count (int, total source items fetched)
  - fresh_count (int, items after dedup/filter)
  - inserted_count (int, articles successfully inserted)
  - skipped_count (int, items skipped due to errors)
  - ai_generated_count (int, articles successfully AI-generated)
  - categories_covered (text[], categories that received articles)
  - error_details (jsonb, structured error info per item)
  - started_at (timestamptz)
  - finished_at (timestamptz)
  - elapsed_ms (int)
  - triggered_by (text: 'cron', 'manual', 'api')
2. Security
- Enable RLS on ingestion_logs
- Grant SELECT to anon, authenticated (monitoring is read-only for all — admin dashboard reads it)
- Grant INSERT, UPDATE to service_role (edge function writes with service role key)
- No public write access — only the edge function (using service_role) can insert/update
*/

CREATE TABLE IF NOT EXISTS ingestion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'running',
  fetched_count int NOT NULL DEFAULT 0,
  fresh_count int NOT NULL DEFAULT 0,
  inserted_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  ai_generated_count int NOT NULL DEFAULT 0,
  categories_covered text[] NOT NULL DEFAULT '{}',
  error_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  elapsed_ms int,
  triggered_by text NOT NULL DEFAULT 'cron'
);

ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON ingestion_logs TO anon, authenticated;
GRANT INSERT, UPDATE ON ingestion_logs TO service_role;

DROP POLICY IF EXISTS "anon_read_ingestion_logs" ON ingestion_logs;
CREATE POLICY "anon_read_ingestion_logs"
ON ingestion_logs FOR SELECT
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_started_at ON ingestion_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_status ON ingestion_logs (status);