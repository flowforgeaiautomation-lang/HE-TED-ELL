-- Populate array-type sections with article-specific derived content.
-- Keep it simple: use scalar expressions that always produce valid JSON.

UPDATE articles
SET story = story
  || jsonb_build_object(
       'key_numbers',
         CASE WHEN jsonb_array_length(COALESCE(story->'key_numbers','[]'::jsonb)) = 0 THEN
           to_jsonb(
             ARRAY[
               jsonb_build_object(
                 'value',
                   CASE WHEN story->>'main_story' IS NOT NULL
                          AND story->>'main_story' ~ '[0-9]+(?:\.[0-9]+)?\s*%'
                        THEN substring(story->>'main_story' FROM '([0-9]+(?:\.[0-9]+)?)\s*%')
                        ELSE 'N/A'
                   END,
                 'context', 'Key figure referenced in the main story.'
               )
             ]
           )
         ELSE story->'key_numbers' END,

       'people',
         CASE WHEN jsonb_array_length(COALESCE(story->'people','[]'::jsonb)) = 0 THEN
           to_jsonb(
             CASE WHEN story->>'summary' IS NOT NULL
                    AND story->>'summary' ~ '\b[A-Z][a-z]+\s[A-Z][a-z]+'
                  THEN ARRAY[
                    jsonb_build_object(
                      'name', substring(story->>'summary' FROM '\b([A-Z][a-z]+\s[A-Z][a-z]+)'),
                      'role', 'Mentioned in coverage of ' || COALESCE(category,'this story')
                    )
                  ]
                  ELSE ARRAY[]::jsonb[]
             END
           )
         ELSE story->'people' END,

       'organizations',
         CASE WHEN jsonb_array_length(COALESCE(story->'organizations','[]'::jsonb)) = 0 THEN
           COALESCE(
             (SELECT jsonb_agg(jsonb_build_object('name', src->>'name', 'type', 'Source organisation'))
              FROM jsonb_array_elements(sources) AS src),
             '[]'::jsonb
           )
         ELSE story->'organizations' END,

       'countries',
         CASE WHEN jsonb_array_length(COALESCE(story->'countries','[]'::jsonb)) = 0 THEN
           to_jsonb(
             ARRAY[
               jsonb_build_object(
                 'name', CASE WHEN country_code IS NOT NULL AND country_code <> '' THEN country_code ELSE 'India' END,
                 'relevance', 'Primary geographic context for this article.'
               )
             ]
           )
         ELSE story->'countries' END,

       'timeline',
         CASE WHEN jsonb_array_length(COALESCE(story->'timeline','[]'::jsonb)) = 0 THEN
           to_jsonb(
             ARRAY[
               jsonb_build_object(
                 'date', to_char(published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
                 'event', COALESCE(NULLIF(story->>'summary',''), title)
               )
             ]
           )
         ELSE story->'timeline' END,

       'vocabulary',
         CASE WHEN jsonb_array_length(COALESCE(story->'vocabulary','[]'::jsonb)) = 0 THEN
           to_jsonb(
             CASE WHEN story->>'main_story' IS NOT NULL THEN
               ARRAY[
                 jsonb_build_object(
                   'word', COALESCE(
                     NULLIF(substring(story->>'main_story' FROM '\b([a-zA-Z]{10,})\b'), ''),
                     NULLIF(substring(title FROM '\b([a-zA-Z]{10,})\b'), ''),
                     'development'
                   ),
                   'definition', 'A term used in this article. See the main story for how it applies here.'
                 )
               ]
             ELSE ARRAY[]::jsonb[] END
           )
         ELSE story->'vocabulary' END
     ),
    updated_at = now()
WHERE TRUE;