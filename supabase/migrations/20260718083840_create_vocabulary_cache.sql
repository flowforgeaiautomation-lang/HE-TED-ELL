/*
# Create vocabulary_cache table (single-tenant, no auth)

1. Purpose
   - Caches dictionary API results (Free Dictionary API / dictionaryapi.dev) so
     repeated vocabulary words reuse verified definitions instead of re-fetching.
   - Stores the full rich vocab entry: part of speech, meaning, simple explanation,
     example sentence, synonyms, antonyms, pronunciation.

2. New Table: vocabulary_cache
   - word (text, primary key, lowercase)
   - part_of_speech (text, nullable)
   - meaning (text, nullable)
   - simple_explanation (text, nullable)
   - example (text, nullable)
   - synonyms (text[], nullable)
   - antonyms (text[], nullable)
   - pronunciation (text, nullable)
   - source (text) — which API produced the entry
   - created_at (timestamptz)
   - updated_at (timestamptz)

3. Security
   - RLS enabled.
   - Single-tenant, no-auth app: anon + authenticated can read and write since
     the cache is intentionally shared/public reference data.
*/

CREATE TABLE IF NOT EXISTS vocabulary_cache (
  word text PRIMARY KEY,
  part_of_speech text,
  meaning text,
  simple_explanation text,
  example text,
  synonyms text[],
  antonyms text[],
  pronunciation text,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vocabulary_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_vocab_cache" ON vocabulary_cache;
CREATE POLICY "anon_read_vocab_cache" ON vocabulary_cache FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vocab_cache" ON vocabulary_cache;
CREATE POLICY "anon_insert_vocab_cache" ON vocabulary_cache FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_vocab_cache" ON vocabulary_cache;
CREATE POLICY "anon_update_vocab_cache" ON vocabulary_cache FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
