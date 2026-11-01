/*
# Clean all article text: remove HTML tags, links, news platform mentions

1. Problems fixed:
   - 39 articles have raw HTML tags (<p>, <a href="...">) in main_story, summary, background
   - 39 articles have "Continue reading..." links pointing to theguardian.com
   - 2 articles mention BBC, 40 mention Guardian, 2 mention Reuters, 18 mention India Today, 10 mention DW
   - These should NOT appear in the article content on THE UNITED HELL

2. This migration:
   - Strips all HTML tags from all text fields in story
   - Removes "Continue reading..." links
   - Removes ALL news platform name mentions from all text fields
   - News platforms removed: BBC, Guardian, Reuters, HT.com, Hindustan Times, NDTV, 
     India Today, CNN, Al Jazeera, DW, Sky News, ABC News, AP News, The Hindu, 
     Times of India, Indian Express, The Wire, Scroll.in, The Quint, ANI, PTI
   - Also removes "reported", "according to [platform]", "said [platform]" patterns

3. Future articles: the trigger and edge function are updated to strip these automatically
*/

-- First, create a helper function to strip HTML and clean text
CREATE OR REPLACE FUNCTION clean_article_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := input_text;
  
  -- Strip HTML tags
  result := regexp_replace(result, '<[^>]+>', '', 'g');
  
  -- Remove "Continue reading..." links (already handled by HTML strip, but just in case)
  result := regexp_replace(result, 'Continue reading\.\.\.', '', 'gi');
  result := regexp_replace(result, 'Continue reading', '', 'gi');
  
  -- Remove news platform names and their common patterns
  -- Remove "BBC Verify", "BBC News", etc.
  result := regexp_replace(result, '\bBBC Verify\b', '', 'gi');
  result := regexp_replace(result, '\bBBC News\b', '', 'gi');
  result := regexp_replace(result, '\bBBC\b', '', 'gi');
  
  -- Remove Guardian mentions
  result := regexp_replace(result, '\bThe Guardian\b', '', 'gi');
  result := regexp_replace(result, '\bGuardian\b', '', 'gi');
  
  -- Remove Reuters
  result := regexp_replace(result, '\bReuters\b', '', 'gi');
  
  -- Remove HT.com / Hindustan Times
  result := regexp_replace(result, '\bHT\.com\b', '', 'gi');
  result := regexp_replace(result, '\bHindustan Times\b', '', 'gi');
  
  -- Remove NDTV
  result := regexp_replace(result, '\bNDTV\b', '', 'gi');
  
  -- Remove India Today
  result := regexp_replace(result, '\bIndia Today\b', '', 'gi');
  
  -- Remove CNN
  result := regexp_replace(result, '\bCNN\b', '', 'gi');
  
  -- Remove Al Jazeera
  result := regexp_replace(result, '\bAl Jazeera\b', '', 'gi');
  
  -- Remove DW
  result := regexp_replace(result, '\bDW\b(?=\s)', '', 'gi');
  result := regexp_replace(result, '\bDW Fact check\b', '', 'gi');
  result := regexp_replace(result, '\bDW\b', '', 'gi');
  
  -- Remove Sky News
  result := regexp_replace(result, '\bSky News\b', '', 'gi');
  
  -- Remove ABC News
  result := regexp_replace(result, '\bABC News\b', '', 'gi');
  
  -- Remove AP News / Associated Press
  result := regexp_replace(result, '\bAP News\b', '', 'gi');
  result := regexp_replace(result, '\bAssociated Press\b', '', 'gi');
  
  -- Remove The Hindu
  result := regexp_replace(result, '\bThe Hindu\b', '', 'gi');
  
  -- Remove Times of India
  result := regexp_replace(result, '\bTimes of India\b', '', 'gi');
  
  -- Remove Indian Express
  result := regexp_replace(result, '\bIndian Express\b', '', 'gi');
  
  -- Remove The Wire
  result := regexp_replace(result, '\bThe Wire\b', '', 'gi');
  
  -- Remove Scroll.in
  result := regexp_replace(result, '\bScroll\.in\b', '', 'gi');
  
  -- Remove The Quint
  result := regexp_replace(result, '\bThe Quint\b', '', 'gi');
  
  -- Remove ANI / PTI
  result := regexp_replace(result, '\bANI\b', '', 'gi');
  result := regexp_replace(result, '\bPTI\b', '', 'gi');
  
  -- Remove Kotaku
  result := regexp_replace(result, '\bKotaku\b', '', 'gi');
  
  -- Remove "according to [platform]" patterns
  result := regexp_replace(result, 'according to (BBC|Guardian|Reuters|HT\.com|Hindustan Times|NDTV|India Today|CNN|Al Jazeera|Sky News|ABC News|AP News|Associated Press|The Hindu|Times of India|Indian Express|The Wire|Scroll\.in|The Quint|ANI|PTI)', '', 'gi');
  
  -- Remove "[platform] reported that" patterns
  result := regexp_replace(result, '(BBC|Guardian|Reuters|HT\.com|Hindustan Times|NDTV|India Today|CNN|Al Jazeera|Sky News|ABC News|AP News|Associated Press|The Hindu|Times of India|Indian Express|The Wire|Scroll\.in|The Quint|ANI|PTI)\s+reported\s+that', '', 'gi');
  
  -- Remove "[platform] reported" patterns
  result := regexp_replace(result, '(BBC|Guardian|Reuters|HT\.com|Hindustan Times|NDTV|India Today|CNN|Al Jazeera|Sky News|ABC News|AP News|Associated Press|The Hindu|Times of India|Indian Express|The Wire|Scroll\.in|The Quint|ANI|PTI)\s+reported', '', 'gi');
  
  -- Remove "said [platform]" patterns
  result := regexp_replace(result, 'said (BBC|Guardian|Reuters|HT\.com|Hindustan Times|NDTV|India Today|CNN|Al Jazeera|Sky News|ABC News|AP News|Associated Press|The Hindu|Times of India|Indian Express|The Wire|Scroll\.in|The Quint|ANI|PTI)', '', 'gi');
  
  -- Remove URLs
  result := regexp_replace(result, 'https?://[^\s"]+', '', 'gi');
  
  -- Clean up extra whitespace left by removals
  result := regexp_replace(result, '\s+', ' ', 'g');
  result := regexp_replace(result, '\.\s*\.\s*\.', '. ', 'g');
  result := regexp_replace(result, '^\s+', '', 'g');
  result := regexp_replace(result, '\s+$', '', 'g');
  result := regexp_replace(result, '\s+([.,;:!?])', '\1', 'g');
  result := regexp_replace(result, '([.,;:!?])\s*\1+', '\1', 'g');
  result := regexp_replace(result, '^\s*[.,;:!?]\s*', '', 'g');
  result := trim(result);
  
  -- Fix sentences that start with lowercase after removal
  result := regexp_replace(result, '^([a-z])', upper(substring(result from 1 for 1)), '');
  
  RETURN result;
END;
$$;

-- Apply the cleaning to ALL text fields in ALL articles
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

-- Also clean key_developments array items
UPDATE articles
SET story = jsonb_set(story, '{key_developments}', 
  (SELECT jsonb_agg(jsonb_build_object(clean_article_text(elem #>> '{}'), '') -> 0)
   FROM jsonb_array_elements(COALESCE(story->'key_developments', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'key_developments', '[]'::jsonb)) > 0;

-- Also clean quick_insights array items
UPDATE articles
SET story = jsonb_set(story, '{quick_insights}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'quick_insights', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'quick_insights', '[]'::jsonb)) > 0;

-- Also clean reader_takeaways array items
UPDATE articles
SET story = jsonb_set(story, '{reader_takeaways}', 
  (SELECT jsonb_agg(to_jsonb(clean_article_text(elem #>> '{}')))
   FROM jsonb_array_elements(COALESCE(story->'reader_takeaways', '[]'::jsonb)) AS elem))
WHERE jsonb_array_length(COALESCE(story->'reader_takeaways', '[]'::jsonb)) > 0;

-- Clean the dek column too
UPDATE articles
SET dek = clean_article_text(dek)
WHERE dek IS NOT NULL;

-- Clean the title column too
UPDATE articles
SET title = clean_article_text(title)
WHERE title IS NOT NULL;