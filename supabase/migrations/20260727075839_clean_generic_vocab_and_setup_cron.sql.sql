-- Clean up remaining generic/placeholder vocabulary entries from vocabulary_cache
-- These have meanings like "A difficult word from the English language" which are not real definitions
UPDATE articles
SET story = jsonb_set(
  story,
  '{vocabulary}',
  (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(story->'vocabulary', '[]'::jsonb)) AS elem
    WHERE elem->>'meaning' IS NOT NULL
      AND elem->>'meaning' NOT LIKE 'A difficult word from the English language%'
      AND elem->>'meaning' NOT LIKE 'A significant term used in this article%'
      AND elem->>'meaning' NOT LIKE 'An important word from the story%'
      AND elem->>'meaning' NOT LIKE 'Detailed examination of something%'
      AND length(elem->>'meaning') >= 15
  ),
  true
)
WHERE is_published = true
  AND story IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(story->'vocabulary', '[]'::jsonb)) AS elem
    WHERE elem->>'meaning' LIKE 'A difficult word from the English language%'
      OR elem->>'meaning' LIKE 'A significant term used in this article%'
      OR elem->>'meaning' LIKE 'An important word from the story%'
      OR elem->>'meaning' LIKE 'Detailed examination of something%'
      OR length(elem->>'meaning') < 15
  );

-- Also clean the vocabulary_cache table of these generic entries
DELETE FROM vocabulary_cache
WHERE meaning LIKE 'A difficult word from the English language%'
   OR meaning LIKE 'A significant term used in this article%'
   OR meaning LIKE 'An important word from the story%'
   OR meaning LIKE 'Detailed examination of something%'
   OR length(meaning) < 15;

-- Set up a cron job to run the backfill-vocab edge function every 30 minutes
-- so new articles always get proper vocabulary
SELECT cron.schedule(
  'backfill-vocab-cron',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.functions_url') || '/backfill-vocab?limit=10',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'apikey', current_setting('app.service_role_key')
      )
    );
  $$
);