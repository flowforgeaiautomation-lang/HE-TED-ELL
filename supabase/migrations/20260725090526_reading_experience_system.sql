/*
# Reading Experience System — database tables

1. New Tables
   - `reading_preferences` (one row per user, JSONB prefs blob + individual columns for common queries)
     - user_id uuid PK = auth.users.id, ON DELETE CASCADE
     - prefs jsonb NOT NULL DEFAULT '{}' — stores the full ReadingPreferences object
     - updated_at timestamptz DEFAULT now()
   - `reading_notes` (personal highlights & notes a user saves on articles)
     - id uuid PK
     - user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
     - article_slug text NOT NULL
     - selected_text text NOT NULL
     - note text
     - color text DEFAULT 'yellow'
     - created_at timestamptz DEFAULT now()
   - `reading_progress` (continue-where-I-left-off + scroll position memory)
     - id uuid PK
     - user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
     - article_slug text NOT NULL
     - scroll_percent numeric DEFAULT 0
     - read_seconds integer DEFAULT 0
     - updated_at timestamptz DEFAULT now()
     - UNIQUE(user_id, article_slug)

2. Security
   - RLS enabled on all three tables.
   - All tables are owner-scoped to authenticated users (TO authenticated, auth.uid() = user_id).
   - reading_preferences also allows anon upsert via a sentinel: anon uses localStorage only, so no anon policy needed.
   - For reading_preferences, use a single-row-per-user model: user_id is the PK.

3. Notes
   - No existing tables are modified or dropped.
   - All tables are safe to re-run (IF NOT EXISTS, DROP POLICY IF EXISTS).
*/

CREATE TABLE IF NOT EXISTS reading_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE reading_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reading_prefs" ON reading_preferences;
CREATE POLICY "select_own_reading_prefs" ON reading_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reading_prefs" ON reading_preferences;
CREATE POLICY "insert_own_reading_prefs" ON reading_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reading_prefs" ON reading_preferences;
CREATE POLICY "update_own_reading_prefs" ON reading_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reading_prefs" ON reading_preferences;
CREATE POLICY "delete_own_reading_prefs" ON reading_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reading_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  article_slug text NOT NULL,
  selected_text text NOT NULL,
  note text,
  color text NOT NULL DEFAULT 'yellow',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reading_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reading_notes" ON reading_notes;
CREATE POLICY "select_own_reading_notes" ON reading_notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reading_notes" ON reading_notes;
CREATE POLICY "insert_own_reading_notes" ON reading_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reading_notes" ON reading_notes;
CREATE POLICY "update_own_reading_notes" ON reading_notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reading_notes" ON reading_notes;
CREATE POLICY "delete_own_reading_notes" ON reading_notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reading_notes_user_slug ON reading_notes(user_id, article_slug);

CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  article_slug text NOT NULL,
  scroll_percent numeric NOT NULL DEFAULT 0,
  read_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, article_slug)
);
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reading_progress" ON reading_progress;
CREATE POLICY "select_own_reading_progress" ON reading_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reading_progress" ON reading_progress;
CREATE POLICY "insert_own_reading_progress" ON reading_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reading_progress" ON reading_progress;
CREATE POLICY "update_own_reading_progress" ON reading_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reading_progress" ON reading_progress;
CREATE POLICY "delete_own_reading_progress" ON reading_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id, updated_at DESC);
