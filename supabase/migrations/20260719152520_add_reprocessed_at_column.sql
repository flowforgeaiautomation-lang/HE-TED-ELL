/*
# Add reprocessed_at column to articles

1. Modified Tables
- `articles`: add `reprocessed_at` (timestamptz, nullable) column.
  This column tracks when each article was last reprocessed through the
  article engine. NULL means the article has not yet been reprocessed with
  the current engine; the reprocessBatch() function selects rows where this
  is NULL and sets it to now() after rewriting.

2. Security
- No RLS policy changes. Existing policies remain in effect.
- No new tables.

3. Notes
- Idempotent: uses IF NOT EXISTS so re-running is safe.
- No data loss: adding a nullable column does not affect existing rows.
*/

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS reprocessed_at timestamptz;

CREATE INDEX IF NOT EXISTS articles_reprocessed_at_idx
  ON articles (reprocessed_at)
  WHERE reprocessed_at IS NULL;
