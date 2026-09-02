/*
# Remove ALL news platform names from sources field

The sources field contains names like "BBC World", "Guardian Science", "NYT Tech", 
"Hindustan Times", "Kotaku", etc. These should NOT appear anywhere on the site.
Replace all source names with a generic neutral name that doesn't reference
any external news platform.
*/

-- Replace all source names with a neutral generic name
-- Keep the URL for internal reference but change the display name
UPDATE articles
SET sources = (
  SELECT jsonb_agg(jsonb_build_object(
    'name', 'The United Hell',
    'url', elem->>'url'
  ))
  FROM jsonb_array_elements(sources) AS elem
)
WHERE sources IS NOT NULL AND jsonb_typeof(sources) = 'array';

-- Also fix sources inside the story JSON
UPDATE articles
SET story = jsonb_set(story, '{sources}',
  (SELECT jsonb_agg(jsonb_build_object(
    'name', 'The United Hell',
    'url', elem->>'url'
  ))
  FROM jsonb_array_elements(COALESCE(story->'sources', '[]'::jsonb)) AS elem)
)
WHERE story->'sources' IS NOT NULL AND jsonb_typeof(story->'sources') = 'array';