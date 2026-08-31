/*
# Add search tracking to vocabulary_cache (single-tenant, no auth)

1. Purpose
   - Track how often each cached word is searched so we can surface
     "Popular Searches" in the Universal Vocabulary Search section.
   - Records the last time each word was looked up, useful for ordering
     recent activity.

2. Modified Table: vocabulary_cache
   - search_count (integer, not null, default 0) — incremented on every lookup.
   - last_searched_at (timestamptz, nullable) — set to now() on each lookup.

3. Security
   - No new tables. Existing RLS policies on vocabulary_cache already allow
     anon + authenticated to read and write (single-tenant, shared reference
     data), so the new columns are accessible under the current policies.
   - No policy changes required.

4. Notes
   - Both columns are added idempotently via a DO block so re-running the
     migration is safe.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vocabulary_cache' AND column_name = 'search_count'
  ) THEN
    ALTER TABLE vocabulary_cache ADD COLUMN search_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vocabulary_cache' AND column_name = 'last_searched_at'
  ) THEN
    ALTER TABLE vocabulary_cache ADD COLUMN last_searched_at timestamptz;
  END IF;
END $$;

-- Index to quickly fetch the most popular words.
CREATE INDEX IF NOT EXISTS vocabulary_cache_search_count_idx
  ON vocabulary_cache (search_count DESC);
