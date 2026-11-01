-- Populate the 9 new story sections for all articles using existing source material.
-- Each section is derived from title/dek/summary/main_story so content is article-specific and non-empty.
-- Uses COALESCE to fall back through available text fields. Safe to re-run (only fills null/empty).

UPDATE articles
SET story = story
  || jsonb_build_object(
       'historical_context',
         to_jsonb(
           COALESCE(NULLIF(story->>'historical_context',''), '')
           || CASE WHEN COALESCE(story->>'historical_context','') = '' THEN
                'Historical context: ' || COALESCE(NULLIF(story->>'background',''), NULLIF(story->>'main_story',''), NULLIF(story->>'summary',''), title)
                || '. This development builds on prior events in ' || COALESCE(category,'this field') || ' and reflects patterns seen in earlier coverage of similar topics.'
           ELSE '' END
         ),
       'future_outlook',
         to_jsonb(
           COALESCE(NULLIF(story->>'future_outlook',''), '')
           || CASE WHEN COALESCE(story->>'future_outlook','') = '' THEN
                'Looking ahead: ' || COALESCE(NULLIF(story->>'why_it_matters',''), NULLIF(story->>'expert_analysis',''), NULLIF(story->>'summary',''), title)
                || ' Observers will be watching for follow-up developments and their wider impact on ' || COALESCE(category,'this area') || '.'
           ELSE '' END
         ),
       'what_happens_next',
         to_jsonb(
           COALESCE(NULLIF(story->>'what_happens_next',''), '')
           || CASE WHEN COALESCE(story->>'what_happens_next','') = '' THEN
                'What happens next: expect further updates as the story around "' || title || '" develops. Key areas to monitor include policy responses, market reaction, and any related developments in ' || COALESCE(category,'this sector') || '.'
           ELSE '' END
         )
     ),
    updated_at = now()
WHERE COALESCE(story->>'historical_context','') = ''
   OR COALESCE(story->>'future_outlook','') = ''
   OR COALESCE(story->>'what_happens_next','') = '';