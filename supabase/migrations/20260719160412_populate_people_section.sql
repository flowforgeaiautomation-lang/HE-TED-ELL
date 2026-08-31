-- Populate people section using title colon-suffix (e.g. "...: Piyush Pandey") and title bigrams.
UPDATE articles
SET story = story
  || jsonb_build_object(
       'people',
         CASE WHEN jsonb_array_length(COALESCE(story->'people','[]'::jsonb)) = 0 THEN
           to_jsonb(
             CASE
               -- Case 1: title has ": <Name>" suffix
               WHEN title ~ ':\s*([A-Z][a-z]+\s[A-Z][a-z]+)' THEN ARRAY[
                 jsonb_build_object(
                   'name', substring(title FROM ':\s*([A-Z][a-z]+\s[A-Z][a-z]+)'),
                   'role', 'Quoted/featured in this article.'
                 )
               ]
               -- Case 2: summary has a capitalised bigram
               WHEN story->>'summary' IS NOT NULL
                    AND story->>'summary' ~ '\b([A-Z][a-z]+\s[A-Z][a-z]+)\b'
                    AND substring(story->>'summary' FROM '\b([A-Z][a-z]+\s[A-Z][a-z]+)\b') !~ '^(The|This|That|An|A|In|On|At|By|For|Of|To|Is|Are|Was|Were|Will|Has|Have|Had|From|With|About|Into|Over|After|Before|During|While|Where|When|What|Which|How|Why|Who)\s'
               THEN ARRAY[
                 jsonb_build_object(
                   'name', substring(story->>'summary' FROM '\b([A-Z][a-z]+\s[A-Z][a-z]+)\b'),
                   'role', 'Mentioned in coverage of ' || COALESCE(category,'this story')
                 )
               ]
               ELSE ARRAY[]::jsonb[]
             END
           )
         ELSE story->'people' END
     ),
    updated_at = now()
WHERE jsonb_array_length(COALESCE(story->'people','[]'::jsonb)) = 0;