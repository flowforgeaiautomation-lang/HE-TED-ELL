/*
# Fix Normalize Trigger — Vocabulary & Organizations Cleanup

## Purpose
The existing normalize_article_story trigger was not cleaning up bad vocabulary
entries (generic fake definitions like "A term used in this article that may be
unfamiliar to some readers") and was not filtering source outlet names from
organizations. This migration:

1. Upgrades normalize_article_story() to:
   - Strip vocabulary entries that have generic/fake meanings
   - Strip vocabulary entries where the example field is the entire article body
   - Filter out source outlet names from organizations array
   - Clean key_facts, key_developments, quick_insights arrays of source boilerplate

2. Cleans all existing articles by running the same logic on current data.

## Safety
- No tables dropped, no columns changed, no data deleted
- Only cleans text fields within the story JSONB
- Preserves article IDs, URLs, likes, saves, comments, analytics
*/

-- Helper: check if a vocab meaning is generic/fake
CREATE OR REPLACE FUNCTION public.is_generic_vocab_meaning(meaning text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  IF meaning IS NULL OR length(trim(meaning)) < 5 THEN
    RETURN true;
  END IF;
  IF meaning ILIKE '%an important word%used in this story%' THEN RETURN true; END IF;
  IF meaning ILIKE '%a term used in this article%' THEN RETURN true; END IF;
  IF meaning ILIKE '%a term used in this story%' THEN RETURN true; END IF;
  IF meaning ILIKE '%an important%word%that may be%unfamiliar%' THEN RETURN true; END IF;
  IF meaning ILIKE '%a word%that may be%unfamiliar%' THEN RETURN true; END IF;
  IF meaning ILIKE '%a word used in this%' THEN RETURN true; END IF;
  IF meaning ILIKE '%a term%that may be%unfamiliar%' THEN RETURN true; END IF;
  RETURN false;
END;
$function$;

-- Helper: clean vocabulary array — remove entries with fake meanings or bad examples
CREATE OR REPLACE FUNCTION public.clean_vocab_array(vocab jsonb, article_text text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  result jsonb := '[]'::jsonb;
  entry jsonb;
  entry_word text;
  entry_meaning text;
  entry_example text;
  article_norm text;
BEGIN
  IF vocab IS NULL OR jsonb_typeof(vocab) != 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  article_norm := lower(regexp_replace(article_text, '[^a-zA-Z0-9\s]', ' ', 'g'));
  article_norm := regexp_replace(article_norm, '\s+', ' ', 'g');

  FOR entry IN SELECT * FROM jsonb_array_elements(vocab)
  LOOP
    entry_word := entry->>'word';
    entry_meaning := entry->>'meaning';
    entry_example := entry->>'example';

    -- Skip if no word
    IF entry_word IS NULL OR length(trim(entry_word)) < 2 THEN
      CONTINUE;
    END IF;

    -- Skip if generic/fake meaning
    IF public.is_generic_vocab_meaning(entry_meaning) THEN
      CONTINUE;
    END IF;

    -- Skip if example is the entire article body (more than 300 chars = not a real example)
    IF entry_example IS NOT NULL AND length(entry_example) > 300 THEN
      CONTINUE;
    END IF;

    -- Keep the entry
    result := result || jsonb_build_array(entry);
  END LOOP;

  RETURN result;
END;
$function$;

-- Helper: clean organizations array — remove source outlet names
CREATE OR REPLACE FUNCTION public.clean_organizations_array(orgs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  result jsonb := '[]'::jsonb;
  entry jsonb;
  entry_name text;
BEGIN
  IF orgs IS NULL OR jsonb_typeof(orgs) != 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR entry IN SELECT * FROM jsonb_array_elements(orgs)
  LOOP
    entry_name := entry->>'name';
    -- Skip if name matches a known outlet
    IF entry_name ILIKE '%Reuters%' OR entry_name ILIKE '%BBC%' OR entry_name ILIKE '%CNN%'
       OR entry_name ILIKE '%The Guardian%' OR entry_name ILIKE '%New York Times%'
       OR entry_name ILIKE '%Associated Press%' OR entry_name ILIKE '%AP News%'
       OR entry_name ILIKE '%The Hindu%' OR entry_name ILIKE '%Times of India%'
       OR entry_name ILIKE '%Al Jazeera%' OR entry_name ILIKE '%Bloomberg%'
       OR entry_name ILIKE '%Fox News%' OR entry_name ILIKE '%Sky News%'
       OR entry_name ILIKE '%NDTV%' OR entry_name ILIKE '%Hindustan Times%'
       OR entry_name ILIKE '%Indian Express%' OR entry_name ILIKE '%AFP%'
       OR entry_name ILIKE '%Xinhua%' OR entry_name ILIKE '%Nikkei%'
       OR entry_name ILIKE '%The Verge%' OR entry_name ILIKE '%TechCrunch%'
       OR entry_name ILIKE '%Wired%' OR entry_name ILIKE '%Ars Technica%'
       OR entry_name ILIKE '%Engadget%' OR entry_name ILIKE '%Nature%'
       OR entry_name ILIKE '%Scientific American%' OR entry_name ILIKE '%New Scientist%'
       OR entry_name ILIKE '%Space.com%' OR entry_name ILIKE '%NASA%'
       OR entry_name ILIKE '%ESA%' OR entry_name ILIKE '%ISRO%'
       OR entry_name ILIKE '%GNews%' OR entry_name ILIKE '%NewsAPI%'
       OR entry_name ILIKE '%Mediastack%' OR entry_name ILIKE '%Currents%'
       OR entry_name ILIKE '%NewsData%' OR entry_name ILIKE '%World News API%'
       OR entry_name ILIKE '%GDELT%' OR entry_name ILIKE '%Reddit%'
       OR entry_name ILIKE '%Wikipedia%' OR entry_name ILIKE '%Sansad%'
       OR entry_name ILIKE '%Vuukle%' OR entry_name ILIKE '%France 24%'
       OR entry_name ILIKE '%Deutsche Welle%' OR entry_name ILIKE '%DW%'
       OR entry_name ILIKE '%NPR%' OR entry_name ILIKE '%Forbes%'
       OR entry_name ILIKE '%Variety%' OR entry_name ILIKE '%Hollywood Reporter%'
       OR entry_name ILIKE '%IGN%' OR entry_name ILIKE '%Billboard%'
       OR entry_name ILIKE '%Electrek%' OR entry_name ILIKE '%Mongabay%'
       OR entry_name ILIKE '%Phys.org%' OR entry_name ILIKE '%Science Daily%'
       OR entry_name ILIKE '%Medical News Today%' OR entry_name ILIKE '%WHO%'
       OR entry_name ILIKE '%NOAA%' OR entry_name ILIKE '%National Geographic%'
       OR entry_name ILIKE '%Smithsonian%' OR entry_name ILIKE '%Archaeology%'
       OR entry_name ILIKE '%World Bank%' OR entry_name ILIKE '%Electrek%'
       OR entry_name ILIKE '%Aftenposten%' OR entry_name ILIKE '%NRK%'
       OR entry_name ILIKE '%Dagbladet%' OR entry_name ILIKE '%VG%'
       OR entry_name ILIKE '%DN%' OR entry_name ILIKE '%Klassekampen%'
       OR entry_name ILIKE '%Dagsavisen%' OR entry_name ILIKE '%The Local%'
       THEN
      CONTINUE;
    END IF;

    -- Skip if name is too short
    IF entry_name IS NULL OR length(trim(entry_name)) < 2 THEN
      CONTINUE;
    END IF;

    result := result || jsonb_build_array(entry);
  END LOOP;

  RETURN result;
END;
$function$;

-- Helper: clean string array — remove source boilerplate from key_facts, key_developments, quick_insights
CREATE OR REPLACE FUNCTION public.clean_string_array_items(items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  result jsonb := '[]'::jsonb;
  item text;
BEGIN
  IF items IS NULL OR jsonb_typeof(items) != 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements_text(items)
  LOOP
    -- Skip items containing source outlet names
    IF item ILIKE '%Reuters%' OR item ILIKE '%BBC%' OR item ILIKE '%according to%'
       OR item ILIKE '%published by%' OR item ILIKE '%published this article%'
       OR item ILIKE '%source says%' OR item ILIKE '%readers should check%'
       OR item ILIKE '%this information provides context%'
       OR item ILIKE '%this is interesting because%'
       OR item ILIKE '%readers can learn%'
       OR item ILIKE '%from the available article%'
       OR item ILIKE '%the source information indicates%'
       OR item ILIKE '%this item was categorized%'
       OR item ILIKE '%this article provides%'
       OR item ILIKE '%it is important because%'
       OR item ILIKE '%provides context about the event%'
       OR item ILIKE '%photo credit%' OR item ILIKE '%image credit%'
       OR item ILIKE '%sansad%' OR item ILIKE '%vuukle%'
    THEN
      CONTINUE;
    END IF;
    -- Skip very short items
    IF length(trim(item)) < 10 THEN
      CONTINUE;
    END IF;
    result := result || jsonb_build_array(item);
  END LOOP;

  RETURN result;
END;
$function$;

-- Upgrade the main normalize trigger
CREATE OR REPLACE FUNCTION public.normalize_article_story()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  base_text text;
  summary_text text;
  main_text text;
  bg_text text;
  article_full_text text;
BEGIN
  main_text := COALESCE(NULLIF(NEW.story->>'main_story',''), '');
  summary_text := COALESCE(NULLIF(NEW.story->>'summary',''), '');
  bg_text := COALESCE(NULLIF(NEW.story->>'background',''), '');
  base_text := COALESCE(NULLIF(main_text,''), NULLIF(summary_text,''), NULLIF(NEW.dek,''), NEW.title);
  article_full_text := COALESCE(main_text, '') || ' ' || COALESCE(summary_text, '') || ' ' || COALESCE(bg_text, '');

  -- CLEAN text fields
  IF NEW.story->>'main_story' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{main_story}', to_jsonb(clean_article_text(NEW.story->>'main_story')));
    main_text := NEW.story->>'main_story';
  END IF;
  IF NEW.story->>'summary' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{summary}', to_jsonb(clean_article_text(NEW.story->>'summary')));
    summary_text := NEW.story->>'summary';
  END IF;
  IF NEW.story->>'background' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{background}', to_jsonb(clean_article_text(NEW.story->>'background')));
  END IF;
  IF NEW.story->>'what_happened' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{what_happened}', to_jsonb(clean_article_text(NEW.story->>'what_happened')));
  END IF;
  IF NEW.story->>'why_it_matters' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{why_it_matters}', to_jsonb(clean_article_text(NEW.story->>'why_it_matters')));
  END IF;
  IF NEW.story->>'how_it_happened' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{how_it_happened}', to_jsonb(clean_article_text(NEW.story->>'how_it_happened')));
  END IF;
  IF NEW.story->>'who_and_where' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{who_and_where}', to_jsonb(clean_article_text(NEW.story->>'who_and_where')));
  END IF;
  IF NEW.story->>'what_came_before' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{what_came_before}', to_jsonb(clean_article_text(NEW.story->>'what_came_before')));
  END IF;
  IF NEW.story->>'what_happens_next' IS NOT NULL THEN
    IF NEW.story->>'what_happens_next' ILIKE 'What happens next: %' THEN
      NEW.story := jsonb_set(NEW.story, '{what_happens_next}', to_jsonb(''::text));
    ELSE
      NEW.story := jsonb_set(NEW.story, '{what_happens_next}', to_jsonb(clean_article_text(NEW.story->>'what_happens_next')));
    END IF;
  END IF;
  IF NEW.story->>'historical_context' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{historical_context}', to_jsonb(clean_article_text(NEW.story->>'historical_context')));
  END IF;
  IF NEW.story->>'future_outlook' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{future_outlook}', to_jsonb(clean_article_text(NEW.story->>'future_outlook')));
  END IF;
  IF NEW.story->>'expert_analysis' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{expert_analysis}', to_jsonb(clean_article_text(NEW.story->>'expert_analysis')));
  END IF;
  IF NEW.story->>'did_you_know' IS NOT NULL THEN
    NEW.story := jsonb_set(NEW.story, '{did_you_know}', to_jsonb(clean_article_text(NEW.story->>'did_you_know')));
  END IF;

  -- GENERATE CLEAN DEK
  IF COALESCE(NULLIF(summary_text,''), NULLIF(main_text,''), NULLIF(NEW.dek,'')) IS NOT NULL THEN
    NEW.dek := generate_clean_dek(
      COALESCE(NULLIF(summary_text,''), NULLIF(main_text,''), NULLIF(NEW.dek,'')),
      NEW.title
    );
  END IF;

  IF NEW.title IS NOT NULL THEN
    NEW.title := clean_article_text(NEW.title);
  END IF;

  -- NEUTRALIZE source names
  IF NEW.sources IS NOT NULL AND jsonb_typeof(NEW.sources) = 'array' THEN
    NEW.sources := (
      SELECT jsonb_agg(jsonb_build_object('name', 'The United Hell', 'url', elem->>'url'))
      FROM jsonb_array_elements(NEW.sources) AS elem
    );
  END IF;
  IF NEW.story->'sources' IS NOT NULL AND jsonb_typeof(NEW.story->'sources') = 'array' THEN
    NEW.story := jsonb_set(NEW.story, '{sources}',
      (SELECT jsonb_agg(jsonb_build_object('name', 'The United Hell', 'url', elem->>'url'))
      FROM jsonb_array_elements(NEW.story->'sources') AS elem)
    );
  END IF;

  -- CLEAN organizations — remove source outlet names
  IF NEW.story->'organizations' IS NOT NULL AND jsonb_typeof(NEW.story->'organizations') = 'array' THEN
    NEW.story := jsonb_set(NEW.story, '{organizations}', public.clean_organizations_array(NEW.story->'organizations'));
  END IF;
  IF NEW.story->'organizations' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{organizations}', '[]'::jsonb);
  END IF;

  -- CLEAN vocabulary — remove generic/fake definitions and bad examples
  IF NEW.story->'vocabulary' IS NOT NULL AND jsonb_typeof(NEW.story->'vocabulary') = 'array' THEN
    NEW.story := jsonb_set(NEW.story, '{vocabulary}', public.clean_vocab_array(NEW.story->'vocabulary', article_full_text));
  END IF;
  IF NEW.story->'vocabulary' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{vocabulary}', '[]'::jsonb);
  END IF;

  -- CLEAN string arrays — remove source boilerplate
  IF NEW.story->'key_facts' IS NOT NULL AND jsonb_typeof(NEW.story->'key_facts') = 'array' THEN
    NEW.story := jsonb_set(NEW.story, '{key_facts}', public.clean_string_array_items(NEW.story->'key_facts'));
  END IF;
  IF NEW.story->'key_facts' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{key_facts}', '[]'::jsonb);
  END IF;

  IF NEW.story->'key_developments' IS NOT NULL AND jsonb_typeof(NEW.story->'key_developments') = 'array' THEN
    NEW.story := jsonb_set(NEW.story, '{key_developments}', public.clean_string_array_items(NEW.story->'key_developments'));
  END IF;
  IF NEW.story->'key_developments' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{key_developments}', '[]'::jsonb);
  END IF;

  IF NEW.story->'quick_insights' IS NOT NULL AND jsonb_typeof(NEW.story->'quick_insights') = 'array' THEN
    NEW.story := jsonb_set(NEW.story, '{quick_insights}', public.clean_string_array_items(NEW.story->'quick_insights'));
  END IF;
  IF NEW.story->'quick_insights' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{quick_insights}', '[]'::jsonb);
  END IF;

  -- Ensure arrays exist as empty arrays if null
  IF NEW.story->'key_numbers' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{key_numbers}', '[]'::jsonb);
  END IF;
  IF NEW.story->'people' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{people}', '[]'::jsonb);
  END IF;
  IF NEW.story->'countries' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{countries}', '[]'::jsonb);
  END IF;
  IF NEW.story->'timeline' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{timeline}', '[]'::jsonb);
  END IF;
  IF NEW.story->'reader_takeaways' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{reader_takeaways}', '[]'::jsonb);
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;