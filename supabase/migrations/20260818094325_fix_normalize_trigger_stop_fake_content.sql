-- Replace normalize_article_story to STOP auto-generating fake content for missing fields.
-- Only clean text, neutralize sources, and replace non-Pexels images.
-- Do NOT fabricate what_happens_next, historical_context, future_outlook, background, key_numbers, people, countries, timeline, vocabulary.

CREATE OR REPLACE FUNCTION public.normalize_article_story()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  base_text text;
  summary_text text;
  main_text text;
  bg_text text;
BEGIN
  main_text := COALESCE(NULLIF(NEW.story->>'main_story',''), '');
  summary_text := COALESCE(NULLIF(NEW.story->>'summary',''), '');
  bg_text := COALESCE(NULLIF(NEW.story->>'background',''), '');
  base_text := COALESCE(NULLIF(main_text,''), NULLIF(summary_text,''), NULLIF(NEW.dek,''), NEW.title);

  -- CLEAN text fields only (no fabrication)
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
    -- Remove old fake "What happens next:" prefixed content
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

  -- Ensure arrays exist as empty arrays if null (but do NOT fabricate content)
  IF NEW.story->'key_facts' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{key_facts}', '[]'::jsonb);
  END IF;
  IF NEW.story->'key_developments' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{key_developments}', '[]'::jsonb);
  END IF;
  IF NEW.story->'quick_insights' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{quick_insights}', '[]'::jsonb);
  END IF;
  IF NEW.story->'key_numbers' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{key_numbers}', '[]'::jsonb);
  END IF;
  IF NEW.story->'people' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{people}', '[]'::jsonb);
  END IF;
  IF NEW.story->'organizations' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{organizations}', '[]'::jsonb);
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
  IF NEW.story->'vocabulary' IS NULL THEN
    NEW.story := jsonb_set(COALESCE(NEW.story, '{}'::jsonb), '{vocabulary}', '[]'::jsonb);
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
