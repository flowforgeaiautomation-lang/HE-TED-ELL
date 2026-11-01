/*
# Create regeneration retry queue

1. New Tables
- `regeneration_queue`: Persistent queue of failed article rewrites.
  - `id` (uuid, primary key)
  - `article_id` (uuid, references articles.id on delete cascade)
  - `source_title` (text) — original article title for context
  - `source_url` (text) — source URL to refetch
  - `source_name` (text) — source publication name
  - `category` (text) — article category slug
  - `cover_image_url` (text) — existing cover image
  - `error_reason` (text) — why the last attempt failed
  - `attempts` (int, default 0) — number of retry attempts so far
  - `max_attempts` (int, default 10) — cap before giving up
  - `status` (text, default 'pending') — pending | in_progress | done | exhausted
  - `next_retry_at` (timestamptz, default now) — when to try next
  - `last_attempted_at` (timestamptz) — when last tried
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

2. Security
- Enable RLS on `regeneration_queue`.
- This is a server-side internal table (only the service role accesses it).
- Deny all access to anon and authenticated roles (service role bypasses RLS).

3. Indexes
- Index on (status, next_retry_at) for efficient queue draining.
- Index on article_id for lookups.

4. Notes
- The retry queue is drained by the reprocess cron/hook.
- Failed rewrites are enqueued with the source URL and error reason.
- Each retry increments attempts; after max_attempts the item is marked exhausted.
- next_retry_at uses exponential backoff: 5min, 15min, 30min, 1h, 2h, 4h, 8h, 24h.
*/

CREATE TABLE IF NOT EXISTS regeneration_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  source_title text,
  source_url text,
  source_name text,
  category text,
  cover_image_url text,
  error_reason text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pending',
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE regeneration_queue ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon/authenticated — only service role (which bypasses RLS) can use this table.
DROP POLICY IF EXISTS "deny_anon_select_regeneration_queue" ON regeneration_queue;
CREATE POLICY "deny_anon_select_regeneration_queue"
  ON regeneration_queue FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "deny_anon_insert_regeneration_queue" ON regeneration_queue;
CREATE POLICY "deny_anon_insert_regeneration_queue"
  ON regeneration_queue FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_update_regeneration_queue" ON regeneration_queue;
CREATE POLICY "deny_anon_update_regeneration_queue"
  ON regeneration_queue FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_delete_regeneration_queue" ON regeneration_queue;
CREATE POLICY "deny_anon_delete_regeneration_queue"
  ON regeneration_queue FOR DELETE
  TO anon, authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS idx_regeneration_queue_status_retry
  ON regeneration_queue (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_regeneration_queue_article_id
  ON regeneration_queue (article_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_regeneration_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_regeneration_queue_updated_at ON regeneration_queue;
CREATE TRIGGER trg_regeneration_queue_updated_at
  BEFORE UPDATE ON regeneration_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_regeneration_queue_updated_at();
