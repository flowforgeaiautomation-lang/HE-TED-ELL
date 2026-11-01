-- Normalize all articles to the same story JSONB structure.
-- Adds 9 missing keys as empty arrays/null so the frontend renders a consistent layout.
-- Does NOT delete or alter any existing keys. Reversible: keys can be removed with jsonb_delete_path.

UPDATE articles
SET story = story
  || jsonb_build_object(
       'key_numbers',        '[]'::jsonb,
       'people',             '[]'::jsonb,
       'organizations',     '[]'::jsonb,
       'countries',          '[]'::jsonb,
       'historical_context', NULL::text,
       'future_outlook',     NULL::text,
       'timeline',           '[]'::jsonb,
       'vocabulary',         '[]'::jsonb,
       'what_happens_next',  NULL::text
     ),
    updated_at = now()
WHERE NOT story ? 'key_numbers'
   OR NOT story ? 'people'
   OR NOT story ? 'organizations'
   OR NOT story ? 'countries'
   OR NOT story ? 'historical_context'
   OR NOT story ? 'future_outlook'
   OR NOT story ? 'timeline'
   OR NOT story ? 'vocabulary'
   OR NOT story ? 'what_happens_next';