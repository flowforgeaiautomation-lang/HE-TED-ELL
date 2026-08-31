/*
# Fix all existing articles: convert organizations from string to JSON array
*/

-- Fix organizations: the value is stored as a JSON string, so we need to
-- extract the text value and parse it back as JSONB
UPDATE articles
SET story = jsonb_set(
  story,
  '{organizations}',
  CASE
    WHEN jsonb_typeof(story->'organizations') = 'string' THEN
      (story->'organizations' #>> '{}')::jsonb
    ELSE
      COALESCE(story->'organizations', '[]'::jsonb)
  END
)
WHERE story->'organizations' IS NOT NULL;

-- Fix sources inside story
UPDATE articles
SET story = jsonb_set(
  story,
  '{sources}',
  CASE
    WHEN jsonb_typeof(story->'sources') = 'string' THEN
      (story->'sources' #>> '{}')::jsonb
    WHEN jsonb_typeof(story->'sources') = 'array' THEN
      story->'sources'
    ELSE
      COALESCE(sources, '[]'::jsonb)
  END
)
WHERE story->'sources' IS NOT NULL;