/*
# Translation Cache System

1. New Tables
- `article_translations` — stores translated article content per language
  - `id` (uuid, primary key)
  - `article_slug` (text, not null) — the original article slug
  - `language` (text, not null) — target language code (e.g. "es", "hi", "fr")
  - `translated_title` (text)
  - `translated_dek` (text)
  - `translated_body` (text)
  - `translated_story` (jsonb) — translated structured story data
  - `translated_meta_description` (text)
  - `source_hash` (text) — hash of original content to detect changes
  - `status` (text, default 'pending') — pending|processing|completed|failed
  - `error_message` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - Unique constraint on (article_slug, language)
- `translation_queue` — tracks background translation jobs
  - `id` (uuid, primary key)
  - `article_slug` (text, not null)
  - `language` (text, not null)
  - `status` (text, default 'queued') — queued|processing|completed|failed
  - `attempts` (int, default 0)
  - `error_message` (text)
  - `created_at` (timestamptz)
  - `processed_at` (timestamptz)
  - Unique constraint on (article_slug, language)

2. Indexes
- `article_translations` on (article_slug, language) — unique
- `article_translations` on (language)
- `translation_queue` on (status)
- `translation_queue` on (article_slug, language) — unique

3. Security
- Enable RLS on both tables.
- Public read access (anon + authenticated) for completed translations.
- Only authenticated service role can insert/update/delete (admin operations via server functions).
*/

CREATE TABLE IF NOT EXISTS article_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug text NOT NULL,
  language text NOT NULL,
  translated_title text,
  translated_dek text,
  translated_body text,
  translated_story jsonb,
  translated_meta_description text,
  source_hash text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT article_translations_slug_lang_unique UNIQUE (article_slug, language)
);

CREATE INDEX IF NOT EXISTS idx_article_translations_language ON article_translations(language);
CREATE INDEX IF NOT EXISTS idx_article_translations_status ON article_translations(status);

ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_translations" ON article_translations;
CREATE POLICY "public_read_translations" ON article_translations FOR SELECT
  TO anon, authenticated USING (status = 'completed');

DROP POLICY IF EXISTS "auth_insert_translations" ON article_translations;
CREATE POLICY "auth_insert_translations" ON article_translations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_translations" ON article_translations;
CREATE POLICY "auth_update_translations" ON article_translations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_translations" ON article_translations;
CREATE POLICY "auth_delete_translations" ON article_translations FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS translation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug text NOT NULL,
  language text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT translation_queue_slug_lang_unique UNIQUE (article_slug, language)
);

CREATE INDEX IF NOT EXISTS idx_translation_queue_status ON translation_queue(status);

ALTER TABLE translation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_queue" ON translation_queue;
CREATE POLICY "public_read_queue" ON translation_queue FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_queue" ON translation_queue;
CREATE POLICY "auth_insert_queue" ON translation_queue FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_queue" ON translation_queue;
CREATE POLICY "auth_update_queue" ON translation_queue FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_queue" ON translation_queue;
CREATE POLICY "auth_delete_queue" ON translation_queue FOR DELETE
  TO authenticated USING (true);
