/*
# Update trigger to pass category to extract_difficult_vocabulary
*/

CREATE OR REPLACE FUNCTION normalize_article_story()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_text text;
  bigram_name text;
  pct_value text;
  cc text;
  common_bigrams text[] := ARRAY['The','This','That','An','A','In','On','At','By','For','Of','To','Is','Are','Was','Were','Will','Has','Have','Had','From','With','About','Into','Over','After','Before','During','While','Where','When','What','Which','How','Why','Who','Gorgeous','Beautiful','Stunning','New','Old','First','Last','Best','Worst','Most','Least','More','Less','Many','Few','Some','All','Each','Every','Both','Either','Neither','Such','Same','Other','Another','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Arc','Marvel','United','World','Today','Daily','Earth','Briefing','Discover','Trending','Information','Policies','Account','Library','Profile','Sections'];
  is_name boolean;
  first_word text;
  second_word text;
  kn jsonb;
  pe jsonb;
  org jsonb;
  co jsonb;
  tl jsonb;
  vo jsonb;
  org_array jsonb;
  summary_text text;
  main_text text;
  bg_text text;
  pexels_url text;
BEGIN
  main_text := COALESCE(NULLIF(NEW.story->>'main_story',''), '');
  summary_text := COALESCE(NULLIF(NEW.story->>'summary',''), '');
  bg_text := COALESCE(NULLIF(NEW.story->>'background',''), '');
  base_text := COALESCE(NULLIF(main_text,''), NULLIF(summary_text,''), NULLIF(NEW.dek,''), NEW.title);

  -- CLEAN ALL text fields
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
    bg_text := NEW.story->>'background';
  END IF;
  IF NEW.dek IS NOT NULL THEN
    NEW.dek := clean_article_text(NEW.dek);
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

  -- REPLACE non-Pexels cover images
  IF NEW.cover_image_url IS NOT NULL AND NEW.cover_image_url != '' AND NEW.cover_image_url NOT ILIKE '%pexels.com%' THEN
    pexels_url := CASE
      WHEN NEW.category = 'technology' THEN 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'science' THEN 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'world' THEN 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'markets' THEN 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'india' THEN 'https://images.pexels.com/photos/15261977/pexels-photo-15261977.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'movies' THEN 'https://images.pexels.com/photos/7231905/pexels-photo-7231905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'music' THEN 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'climate' THEN 'https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'football' THEN 'https://images.pexels.com/photos/47730/pexels-photo-47730.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'books' THEN 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'health' THEN 'https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'space' THEN 'https://images.pexels.com/photos/220201/pexels-photo-220201.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'gaming' THEN 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'artificial-intelligence' THEN 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'cricket' THEN 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'sport' THEN 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-ball-46798.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'politics' THEN 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'environment' THEN 'https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'business' THEN 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'entertainment' THEN 'https://images.pexels.com/photos/7231905/pexels-photo-7231905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      WHEN NEW.category = 'culture' THEN 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
      ELSE 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
    END;
    NEW.cover_image_url := pexels_url;
  END IF;

  -- Fix organizations
  org := NEW.story->'organizations';
  IF org IS NULL OR jsonb_typeof(org) != 'array' THEN
    NEW.story := NEW.story || jsonb_build_object('organizations', '[]'::jsonb);
  END IF;

  -- Expert analysis
  IF COALESCE(NEW.story->>'expert_analysis','') = '' OR NEW.story->>'expert_analysis' ILIKE 'Analysts note that%' THEN
    NEW.story := NEW.story || jsonb_build_object('expert_analysis',
      'Expert analysis: ' || base_text || ' Experts in ' || COALESCE(NEW.category, 'this field') ||
      ' suggest this development could have significant implications. The broader context reveals a pattern that extends beyond this single event, with potential effects on related areas and future developments in ' || COALESCE(NEW.category, 'this sector') || '.');
    NEW.story := jsonb_set(NEW.story, '{expert_analysis}', to_jsonb(clean_article_text(NEW.story->>'expert_analysis')));
  END IF;

  -- Why it matters
  IF COALESCE(NEW.story->>'why_it_matters','') = '' OR NEW.story->>'why_it_matters' ILIKE 'This story matters because%' THEN
    NEW.story := NEW.story || jsonb_build_object('why_it_matters',
      'Why it matters: ' || COALESCE(NULLIF(summary_text,''), NEW.title) ||
      ' This is significant because it affects ' || COALESCE(NEW.category, 'the relevant sector') ||
      ' and could influence future decisions and outcomes. Understanding this story helps readers grasp the wider forces shaping ' || COALESCE(NEW.category, 'this area') || ' today.');
    NEW.story := jsonb_set(NEW.story, '{why_it_matters}', to_jsonb(clean_article_text(NEW.story->>'why_it_matters')));
  END IF;

  -- Did you know
  IF COALESCE(NEW.story->>'did_you_know','') = '' OR NEW.story->>'did_you_know' ILIKE 'Did you know? This story connects%' THEN
    NEW.story := NEW.story || jsonb_build_object('did_you_know',
      'Did you know? ' || COALESCE(NULLIF(bg_text,''), NULLIF(summary_text,''), NEW.title) ||
      ' This topic has deep roots in ' || COALESCE(NEW.category, 'this field') || ' and connects to other important developments.');
    NEW.story := jsonb_set(NEW.story, '{did_you_know}', to_jsonb(clean_article_text(NEW.story->>'did_you_know')));
  END IF;

  -- Historical context
  IF COALESCE(NEW.story->>'historical_context','') = '' OR NEW.story->>'historical_context' ILIKE 'Historical context: %' THEN
    NEW.story := NEW.story || jsonb_build_object('historical_context',
      'Historical context: ' || COALESCE(NULLIF(bg_text,''), NULLIF(summary_text,''), NEW.title) ||
      ' This development builds on a longer history of events in ' || COALESCE(NEW.category, 'this field') || '.');
    NEW.story := jsonb_set(NEW.story, '{historical_context}', to_jsonb(clean_article_text(NEW.story->>'historical_context')));
  END IF;

  -- Future outlook
  IF COALESCE(NEW.story->>'future_outlook','') = '' OR NEW.story->>'future_outlook' ILIKE 'Looking ahead: %' THEN
    NEW.story := NEW.story || jsonb_build_object('future_outlook',
      'Future outlook: ' || COALESCE(NULLIF(summary_text,''), NEW.title) ||
      ' Looking forward, this story is likely to develop further as new information emerges.');
    NEW.story := jsonb_set(NEW.story, '{future_outlook}', to_jsonb(clean_article_text(NEW.story->>'future_outlook')));
  END IF;

  -- What happens next
  IF COALESCE(NEW.story->>'what_happens_next','') = '' OR NEW.story->>'what_happens_next' ILIKE 'What happens next: %' THEN
    NEW.story := NEW.story || jsonb_build_object('what_happens_next',
      'What happens next: ' || COALESCE(NULLIF(summary_text,''), NEW.title) ||
      ' Expect further updates as the situation around "' || NEW.title || '" continues to unfold.');
    NEW.story := jsonb_set(NEW.story, '{what_happens_next}', to_jsonb(clean_article_text(NEW.story->>'what_happens_next')));
  END IF;

  -- key_numbers
  kn := COALESCE(NEW.story->'key_numbers','[]'::jsonb);
  IF (kn IS NULL OR jsonb_typeof(kn) != 'array' OR jsonb_array_length(kn) = 0) THEN
    pct_value := CASE WHEN base_text ~ '[0-9]+(?:\.[0-9]+)?\s*%' THEN substring(base_text FROM '([0-9]+(?:\.[0-9]+)?)\s*%') ELSE 'N/A' END;
    NEW.story := NEW.story || jsonb_build_object('key_numbers', to_jsonb(ARRAY[jsonb_build_object('value', pct_value, 'context', 'Key figure referenced in the main story.')]));
  END IF;

  -- people
  pe := COALESCE(NEW.story->'people','[]'::jsonb);
  IF (pe IS NULL OR jsonb_typeof(pe) != 'array' OR jsonb_array_length(pe) = 0) THEN
    bigram_name := NULL;
    IF NEW.title ~ ':\s*([A-Z][a-z]+\s[A-Z][a-z]+)' THEN
      bigram_name := substring(NEW.title FROM ':\s*([A-Z][a-z]+\s[A-Z][a-z]+)');
      first_word := split_part(bigram_name, ' ', 1);
      second_word := split_part(bigram_name, ' ', 2);
      is_name := (first_word != ALL(common_bigrams)) AND (second_word != ALL(common_bigrams)) AND first_word !~ '(ing|ed)$' AND second_word !~ '(ing|ed|s)$';
      IF NOT is_name THEN bigram_name := NULL; END IF;
    END IF;
    IF bigram_name IS NOT NULL THEN
      NEW.story := NEW.story || jsonb_build_object('people', to_jsonb(ARRAY[jsonb_build_object('name', bigram_name, 'role', 'Mentioned in coverage of ' || COALESCE(NEW.category,'this story'))]));
    ELSE
      NEW.story := NEW.story || jsonb_build_object('people', '[]'::jsonb);
    END IF;
  END IF;

  -- countries
  co := COALESCE(NEW.story->'countries','[]'::jsonb);
  IF (co IS NULL OR jsonb_typeof(co) != 'array' OR jsonb_array_length(co) = 0) THEN
    cc := CASE WHEN NEW.country_code IS NOT NULL AND NEW.country_code <> '' THEN NEW.country_code ELSE 'Global' END;
    NEW.story := NEW.story || jsonb_build_object('countries', to_jsonb(ARRAY[jsonb_build_object('name', cc, 'relevance', 'Primary geographic context for this article.')]));
  END IF;

  -- timeline
  tl := COALESCE(NEW.story->'timeline','[]'::jsonb);
  IF (tl IS NULL OR jsonb_typeof(tl) != 'array' OR jsonb_array_length(tl) = 0) THEN
    NEW.story := NEW.story || jsonb_build_object('timeline', to_jsonb(ARRAY[jsonb_build_object('date', to_char(COALESCE(NEW.published_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD'), 'event', COALESCE(NULLIF(summary_text,''), NEW.title))]));
  END IF;

  -- vocabulary: use extract_difficult_vocabulary WITH category
  vo := COALESCE(NEW.story->'vocabulary','[]'::jsonb);
  IF (vo IS NULL OR jsonb_typeof(vo) != 'array' OR jsonb_array_length(vo) = 0) THEN
    NEW.story := NEW.story || jsonb_build_object('vocabulary', extract_difficult_vocabulary(COALESCE(NULLIF(main_text,''), NULLIF(summary_text,''), NEW.title), NEW.title, NEW.category));
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;