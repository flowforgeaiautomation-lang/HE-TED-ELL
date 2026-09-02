/*
# Fix clean_article_text function to be more aggressive

The previous version missed:
- "BBC Verify", "BBC Sport" (BBC followed by a word)
- "Guardian bookshop", "Support the Guardian", "Guardian bookshop"
- "Archive: AP, Reuters"
- URLs embedded in text (theguardian.com/sciencepod)
- "Order Original Sin from the Guardian bookshop"
*/

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
  
  -- Remove URLs (any http/https link)
  result := regexp_replace(result, 'https?://[^\s"<]+', '', 'gi');
  result := regexp_replace(result, 'www\.[^\s"<]+', '', 'gi');
  
  -- Remove "Continue reading..." and similar
  result := regexp_replace(result, 'Continue reading[^.]*\.?', '', 'gi');
  
  -- Remove "Order [something] from [platform] bookshop" patterns
  result := regexp_replace(result, 'Order[^.]+from[^.]+bookshop', '', 'gi');
  result := regexp_replace(result, 'Support the Guardian[^.]*', '', 'gi');
  
  -- Remove "Archive: [platforms]" patterns
  result := regexp_replace(result, 'Archive:\s*(BBC|Guardian|Reuters|AP|ANI|PTI|CNN|NDTV|India Today|Al Jazeera|DW|Sky News|ABC News|AP News|Associated Press|The Hindu|Times of India|Indian Express|The Wire|Scroll\.in|The Quint)(,\s*(BBC|Guardian|Reuters|AP|ANI|PTI|CNN|NDTV|India Today|Al Jazeera|DW|Sky News|ABC News|AP News|Associated Press|The Hindu|Times of India|Indian Express|The Wire|Scroll\.in|The Quint))*', '', 'gi');
  
  -- Remove ALL news platform mentions aggressively
  -- BBC (including BBC Verify, BBC Sport, BBC News, etc.)
  result := regexp_replace(result, '\bBBC\s+\w+', '', 'gi');
  result := regexp_replace(result, '\bBBC\b', '', 'gi');
  
  -- Guardian (including The Guardian, Guardian bookshop, etc.)
  result := regexp_replace(result, '\bThe\s+Guardian\b', '', 'gi');
  result := regexp_replace(result, '\bGuardian\s+\w+', '', 'gi');
  result := regexp_replace(result, '\bGuardian\b', '', 'gi');
  
  -- Reuters
  result := regexp_replace(result, '\bReuters\b', '', 'gi');
  
  -- HT.com / Hindustan Times
  result := regexp_replace(result, '\bHT\.com\b', '', 'gi');
  result := regexp_replace(result, '\bHindustan\s+Times\b', '', 'gi');
  
  -- NDTV
  result := regexp_replace(result, '\bNDTV\b', '', 'gi');
  
  -- India Today
  result := regexp_replace(result, '\bIndia\s+Today\b', '', 'gi');
  
  -- CNN
  result := regexp_replace(result, '\bCNN\b', '', 'gi');
  
  -- Al Jazeera
  result := regexp_replace(result, '\bAl\s+Jazeera\b', '', 'gi');
  
  -- DW (including DW Fact check, etc.)
  result := regexp_replace(result, '\bDW\s+\w+', '', 'gi');
  result := regexp_replace(result, '\bDW\b', '', 'gi');
  
  -- Sky News
  result := regexp_replace(result, '\bSky\s+News\b', '', 'gi');
  
  -- ABC News
  result := regexp_replace(result, '\bABC\s+News\b', '', 'gi');
  
  -- AP News / Associated Press / AP
  result := regexp_replace(result, '\bAP\s+News\b', '', 'gi');
  result := regexp_replace(result, '\bAssociated\s+Press\b', '', 'gi');
  result := regexp_replace(result, '\bAP\b', '', 'gi');
  
  -- The Hindu
  result := regexp_replace(result, '\bThe\s+Hindu\b', '', 'gi');
  
  -- Times of India
  result := regexp_replace(result, '\bTimes\s+of\s+India\b', '', 'gi');
  
  -- Indian Express
  result := regexp_replace(result, '\bIndian\s+Express\b', '', 'gi');
  
  -- The Wire
  result := regexp_replace(result, '\bThe\s+Wire\b', '', 'gi');
  
  -- Scroll.in
  result := regexp_replace(result, '\bScroll\.in\b', '', 'gi');
  
  -- The Quint
  result := regexp_replace(result, '\bThe\s+Quint\b', '', 'gi');
  
  -- ANI / PTI
  result := regexp_replace(result, '\bANI\b', '', 'gi');
  result := regexp_replace(result, '\bPTI\b', '', 'gi');
  
  -- Kotaku
  result := regexp_replace(result, '\bKotaku\b', '', 'gi');
  
  -- Remove "according to [platform]" patterns
  result := regexp_replace(result, 'according to\s+', '', 'gi');
  
  -- Remove "[platform] reported that" / "[platform] reported" patterns  
  result := regexp_replace(result, '\w+\s+reported\s+that\s+', '', 'gi');
  result := regexp_replace(result, '\w+\s+reported\s+', '', 'gi');
  
  -- Remove "said [platform]" patterns
  result := regexp_replace(result, 'said\s+', '', 'gi');
  
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

-- Re-apply cleaning to ALL text fields in ALL articles
UPDATE articles
SET story = jsonb_set(story, '{main_story}', to_jsonb(clean_article_text(story->>'main_story')))
WHERE story->>'main_story' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{summary}', to_jsonb(clean_article_text(story->>'summary')))
WHERE story->>'summary' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{background}', to_jsonb(clean_article_text(story->>'background')))
WHERE story->>'background' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{expert_analysis}', to_jsonb(clean_article_text(story->>'expert_analysis')))
WHERE story->>'expert_analysis' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{why_it_matters}', to_jsonb(clean_article_text(story->>'why_it_matters')))
WHERE story->>'why_it_matters' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{did_you_know}', to_jsonb(clean_article_text(story->>'did_you_know')))
WHERE story->>'did_you_know' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{historical_context}', to_jsonb(clean_article_text(story->>'historical_context')))
WHERE story->>'historical_context' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{future_outlook}', to_jsonb(clean_article_text(story->>'future_outlook')))
WHERE story->>'future_outlook' IS NOT NULL;

UPDATE articles
SET story = jsonb_set(story, '{what_happens_next}', to_jsonb(clean_article_text(story->>'what_happens_next')))
WHERE story->>'what_happens_next' IS NOT NULL;

-- Clean array fields
UPDATE articles
SET story = jsonb_set(story, '{key_developments}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'key_developments', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'key_developments', '[]'::jsonb)) > 0;

UPDATE articles
SET story = jsonb_set(story, '{quick_insights}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'quick_insights', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'quick_insights', '[]'::jsonb)) > 0;

UPDATE articles
SET story = jsonb_set(story, '{reader_takeaways}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'reader_takeaways', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'reader_takeaways', '[]'::jsonb)) > 0;

UPDATE articles
SET dek = clean_article_text(dek)
WHERE dek IS NOT NULL;

UPDATE articles
SET title = clean_article_text(title)
WHERE title IS NOT NULL;