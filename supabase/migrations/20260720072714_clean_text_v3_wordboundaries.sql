/*
# Fix remaining news platform mentions

PostgreSQL doesn't support \b word boundaries in regex.
Fix the remaining 2 BBC and 1 Guardian mentions with direct replacement.
Also update clean_article_text to use \y (PostgreSQL word boundary) instead of \b.
*/

-- Fix the clean_article_text function to use PostgreSQL word boundary \y
CREATE OR REPLACE FUNCTION clean_article_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  IF input_text IS NULL THEN RETURN NULL; END IF;
  result := input_text;
  
  -- Strip ALL HTML tags
  result := regexp_replace(result, '<[^>]+>', '', 'g');
  
  -- Remove URLs
  result := regexp_replace(result, 'https?://[^\s"<]+', '', 'gi');
  result := regexp_replace(result, 'www\.[^\s"<]+', '', 'gi');
  
  -- Remove "Continue reading..." and similar
  result := regexp_replace(result, 'Continue reading[^.]*\.?', '', 'gi');
  
  -- Remove "Order [something] from [platform] bookshop" patterns
  result := regexp_replace(result, 'Order[^.]+from[^.]+bookshop', '', 'gi');
  result := regexp_replace(result, 'Support the Guardian[^.]*', '', 'gi');
  
  -- Remove "Archive: [platforms]" patterns
  result := regexp_replace(result, 'Archive:\s*[A-Za-z, ]+', '', 'gi');
  
  -- Remove ALL news platform mentions using \y word boundary (PostgreSQL)
  -- BBC (including BBC Verify, BBC Sport, BBC News, etc.)
  result := regexp_replace(result, '\yBBC\s+[A-Za-z]+\y', '', 'gi');
  result := regexp_replace(result, '\yBBC\y', '', 'gi');
  
  -- Guardian
  result := regexp_replace(result, '\yThe\s+Guardian\y', '', 'gi');
  result := regexp_replace(result, '\yGuardian\s+[A-Za-z]+\y', '', 'gi');
  result := regexp_replace(result, '\yGuardian\y', '', 'gi');
  
  -- Reuters
  result := regexp_replace(result, '\yReuters\y', '', 'gi');
  
  -- HT.com / Hindustan Times
  result := regexp_replace(result, '\yHT\.com\y', '', 'gi');
  result := regexp_replace(result, '\yHindustan\s+Times\y', '', 'gi');
  
  -- NDTV
  result := regexp_replace(result, '\yNDTV\y', '', 'gi');
  
  -- India Today
  result := regexp_replace(result, '\yIndia\s+Today\y', '', 'gi');
  
  -- CNN
  result := regexp_replace(result, '\yCNN\y', '', 'gi');
  
  -- Al Jazeera
  result := regexp_replace(result, '\yAl\s+Jazeera\y', '', 'gi');
  
  -- DW
  result := regexp_replace(result, '\yDW\s+[A-Za-z]+\y', '', 'gi');
  result := regexp_replace(result, '\yDW\y', '', 'gi');
  
  -- Sky News, ABC News, AP News, Associated Press, AP
  result := regexp_replace(result, '\ySky\s+News\y', '', 'gi');
  result := regexp_replace(result, '\yABC\s+News\y', '', 'gi');
  result := regexp_replace(result, '\yAP\s+News\y', '', 'gi');
  result := regexp_replace(result, '\yAssociated\s+Press\y', '', 'gi');
  result := regexp_replace(result, '\yAP\y', '', 'gi');
  
  -- Indian platforms
  result := regexp_replace(result, '\yThe\s+Hindu\y', '', 'gi');
  result := regexp_replace(result, '\yTimes\s+of\s+India\y', '', 'gi');
  result := regexp_replace(result, '\yIndian\s+Express\y', '', 'gi');
  result := regexp_replace(result, '\yThe\s+Wire\y', '', 'gi');
  result := regexp_replace(result, '\yScroll\.in\y', '', 'gi');
  result := regexp_replace(result, '\yThe\s+Quint\y', '', 'gi');
  result := regexp_replace(result, '\yANI\y', '', 'gi');
  result := regexp_replace(result, '\yPTI\y', '', 'gi');
  result := regexp_replace(result, '\yKotaku\y', '', 'gi');
  
  -- Remove "according to" patterns
  result := regexp_replace(result, 'according to\s+', '', 'gi');
  
  -- Clean up extra whitespace
  result := regexp_replace(result, '\s+', ' ', 'g');
  result := regexp_replace(result, '\s+([.,;:!?])', '\1', 'g');
  result := regexp_replace(result, '([.,;:!?])\s*\1+', '\1', 'g');
  result := regexp_replace(result, '\.\s*\.\s*\.', '. ', 'g');
  result := regexp_replace(result, '^\s*[.,;:!?]\s*', '', 'g');
  result := regexp_replace(result, '^\s+', '', 'g');
  result := regexp_replace(result, '\s+$', '', 'g');
  result := trim(result);
  
  -- Capitalize first letter
  IF length(result) > 0 THEN
    result := upper(substring(result from 1 for 1)) || substring(result from 2);
  END IF;
  
  RETURN result;
END;
$$;

-- Re-apply to ALL text fields
UPDATE articles SET story = jsonb_set(story, '{main_story}', to_jsonb(clean_article_text(story->>'main_story'))) WHERE story->>'main_story' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{summary}', to_jsonb(clean_article_text(story->>'summary'))) WHERE story->>'summary' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{background}', to_jsonb(clean_article_text(story->>'background'))) WHERE story->>'background' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{expert_analysis}', to_jsonb(clean_article_text(story->>'expert_analysis'))) WHERE story->>'expert_analysis' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{why_it_matters}', to_jsonb(clean_article_text(story->>'why_it_matters'))) WHERE story->>'why_it_matters' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{did_you_know}', to_jsonb(clean_article_text(story->>'did_you_know'))) WHERE story->>'did_you_know' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{historical_context}', to_jsonb(clean_article_text(story->>'historical_context'))) WHERE story->>'historical_context' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{future_outlook}', to_jsonb(clean_article_text(story->>'future_outlook'))) WHERE story->>'future_outlook' IS NOT NULL;
UPDATE articles SET story = jsonb_set(story, '{what_happens_next}', to_jsonb(clean_article_text(story->>'what_happens_next'))) WHERE story->>'what_happens_next' IS NOT NULL;

-- Clean array fields
UPDATE articles SET story = jsonb_set(story, '{key_developments}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'key_developments', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'key_developments', '[]'::jsonb)) > 0;

UPDATE articles SET story = jsonb_set(story, '{quick_insights}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'quick_insights', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'quick_insights', '[]'::jsonb)) > 0;

UPDATE articles SET story = jsonb_set(story, '{reader_takeaways}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'reader_takeaways', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'reader_takeaways', '[]'::jsonb)) > 0;

UPDATE articles SET dek = clean_article_text(dek) WHERE dek IS NOT NULL;
UPDATE articles SET title = clean_article_text(title) WHERE title IS NOT NULL;