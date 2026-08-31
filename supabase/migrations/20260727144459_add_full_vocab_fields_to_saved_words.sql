/*
# Add full vocabulary fields to saved_words

## What this does
Adds three columns to the `saved_words` table so that when a user saves a word
from the Vocabulary Builder, ALL the information shown on the card is stored and
displayed exactly as saved — not just a subset.

## New columns on `saved_words`
1. `simple_explanation` (text) — the "Easy meaning" shown on the vocab card.
2. `context_in_article` (text) — the "In this article" context line.
3. `word_origin` (text) — the "Origin" / etymology line.

## Notes
- All three columns are nullable (existing rows stay valid).
- No data is lost — this is purely additive.
- RLS already covers the table (owner-scoped to authenticated users).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_words' AND column_name = 'simple_explanation'
  ) THEN
    ALTER TABLE saved_words ADD COLUMN simple_explanation text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_words' AND column_name = 'context_in_article'
  ) THEN
    ALTER TABLE saved_words ADD COLUMN context_in_article text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_words' AND column_name = 'word_origin'
  ) THEN
    ALTER TABLE saved_words ADD COLUMN word_origin text;
  END IF;
END $$;
