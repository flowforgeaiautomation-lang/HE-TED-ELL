-- Remove external media outlet names from story JSONB organizations array
DO $$
DECLARE
  r RECORD;
  cleaned_orgs JSONB;
  cleaned_story JSONB;
BEGIN
  FOR r IN SELECT id, story FROM articles WHERE story ? 'organizations' LOOP
    cleaned_orgs := '[]'::jsonb;
    IF jsonb_typeof(r.story->'organizations') = 'array' THEN
      FOR i IN 0..jsonb_array_length(r.story->'organizations') - 1 LOOP
        DECLARE
          org JSONB := r.story->'organizations'->i;
          org_name TEXT := LOWER(org->>'name');
        BEGIN
          -- Skip organizations that are external media outlets
          IF org_name !~ '(reuters|bbc|cnn|the guardian|new york times|nyt|associated press|ap news|the hindu|times of india|al jazeera|bloomberg|fox news|sky news|ndtv|hindustan times|indian express|ani|pti|afp|xinhua|nikkei|the verge|techcrunch|wired|ars technica|engadget|nature|scientific american|new scientist|space\.com|nasa|esa|isro|sansad|vuukle|bbc world|bbc news)' THEN
            cleaned_orgs := cleaned_orgs || jsonb_build_array(org);
          END IF;
        END;
      END LOOP;
    END IF;
    -- Replace organizations with cleaned version
    cleaned_story := jsonb_set(r.story, '{organizations}', cleaned_orgs);
    UPDATE articles SET story = cleaned_story WHERE id = r.id;
  END LOOP;
END $$;
