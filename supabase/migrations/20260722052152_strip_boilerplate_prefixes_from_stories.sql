-- Strip AI-generated boilerplate prefixes from story fields
DO $$
DECLARE
  r RECORD;
  cleaned_story JSONB;
  new_val TEXT;
BEGIN
  FOR r IN SELECT id, story FROM articles LOOP
    cleaned_story := r.story;
    
    -- Strip "Expert analysis: " prefix
    IF cleaned_story ? 'expert_analysis' THEN
      new_val := cleaned_story->>'expert_analysis';
      new_val := REGEXP_REPLACE(new_val, '^Expert analysis:\s*', '', 'i');
      cleaned_story := jsonb_set(cleaned_story, '{expert_analysis}', to_jsonb(new_val));
    END IF;
    
    -- Strip "Why it matters: " prefix
    IF cleaned_story ? 'why_it_matters' THEN
      new_val := cleaned_story->>'why_it_matters';
      new_val := REGEXP_REPLACE(new_val, '^Why it matters:\s*', '', 'i');
      cleaned_story := jsonb_set(cleaned_story, '{why_it_matters}', to_jsonb(new_val));
    END IF;
    
    -- Strip "Did you know? " prefix
    IF cleaned_story ? 'did_you_know' THEN
      new_val := cleaned_story->>'did_you_know';
      new_val := REGEXP_REPLACE(new_val, '^Did you know\?\s*', '', 'i');
      cleaned_story := jsonb_set(cleaned_story, '{did_you_know}', to_jsonb(new_val));
    END IF;
    
    -- Strip "Future outlook: " prefix
    IF cleaned_story ? 'future_outlook' THEN
      new_val := cleaned_story->>'future_outlook';
      new_val := REGEXP_REPLACE(new_val, '^Future outlook:\s*', '', 'i');
      cleaned_story := jsonb_set(cleaned_story, '{future_outlook}', to_jsonb(new_val));
    END IF;
    
    -- Strip "Historical context: " prefix
    IF cleaned_story ? 'historical_context' THEN
      new_val := cleaned_story->>'historical_context';
      new_val := REGEXP_REPLACE(new_val, '^Historical context:\s*', '', 'i');
      cleaned_story := jsonb_set(cleaned_story, '{historical_context}', to_jsonb(new_val));
    END IF;
    
    -- Strip "What happens next: " prefix
    IF cleaned_story ? 'what_happens_next' THEN
      new_val := cleaned_story->>'what_happens_next';
      new_val := REGEXP_REPLACE(new_val, '^What happens next:\s*', '', 'i');
      cleaned_story := jsonb_set(cleaned_story, '{what_happens_next}', to_jsonb(new_val));
    END IF;
    
    UPDATE articles SET story = cleaned_story WHERE id = r.id;
  END LOOP;
END $$;
