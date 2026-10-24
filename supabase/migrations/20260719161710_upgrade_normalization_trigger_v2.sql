-- Upgrade normalization trigger to produce frontend-ready vocabulary objects
-- and fix people extraction to avoid false positives like "Gorgeous Animations".

CREATE OR REPLACE FUNCTION normalize_article_story()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_text text;
  src_name text;
  bigram_name text;
  long_word text;
  pct_value text;
  cc text;
  common_bigrams text[] := ARRAY['The','This','That','An','A','In','On','At','By','For','Of','To','Is','Are','Was','Were','Will','Has','Have','Had','From','With','About','Into','Over','After','Before','During','While','Where','When','What','Which','How','Why','Who','Gorgeous','Beautiful','Stunning','New','Old','First','Last','Best','Worst','Most','Least','More','Less','Many','Few','Some','All','Each','Every','Both','Either','Neither','Such','Same','Other','Another','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Arc','Marvel','United','World','Today','Daily','Earth','Briefing','Discover','Trending','Information','Policies','Account','Library','Profile','Sections'];
  is_name boolean;
  first_word text;
  second_word text;
BEGIN
  base_text := COALESCE(NULLIF(NEW.story->>'main_story',''),
                       NULLIF(NEW.story->>'summary',''),
                       NULLIF(NEW.dek,''),
                       NEW.title);

  -- Text sections
  IF COALESCE(NEW.story->>'historical_context','') = '' THEN
    NEW.story := NEW.story || jsonb_build_object(
      'historical_context',
      'Historical context: ' || COALESCE(NULLIF(NEW.story->>'background',''), base_text)
      || '. This development builds on prior events in ' || COALESCE(NEW.category,'this field')
      || ' and reflects patterns seen in earlier coverage of similar topics.'
    );
  END IF;

  IF COALESCE(NEW.story->>'future_outlook','') = '' THEN
    NEW.story := NEW.story || jsonb_build_object(
      'future_outlook',
      'Looking ahead: ' || COALESCE(NULLIF(NEW.story->>'why_it_matters',''),
                                    NULLIF(NEW.story->>'expert_analysis',''),
                                    NULLIF(NEW.story->>'summary',''), NEW.title)
      || ' Observers will be watching for follow-up developments and their wider impact on '
      || COALESCE(NEW.category,'this area') || '.'
    );
  END IF;

  IF COALESCE(NEW.story->>'what_happens_next','') = '' THEN
    NEW.story := NEW.story || jsonb_build_object(
      'what_happens_next',
      'What happens next: expect further updates as the story around "' || NEW.title
      || '" develops. Key areas to monitor include policy responses, market reaction, and any related developments in '
      || COALESCE(NEW.category,'this sector') || '.'
    );
  END IF;

  -- key_numbers
  IF jsonb_array_length(COALESCE(NEW.story->'key_numbers','[]'::jsonb)) = 0 THEN
    pct_value := CASE WHEN base_text ~ '[0-9]+(?:\.[0-9]+)?\s*%'
                      THEN substring(base_text FROM '([0-9]+(?:\.[0-9]+)?)\s*%')
                      ELSE 'N/A' END;
    NEW.story := NEW.story || jsonb_build_object(
      'key_numbers', to_jsonb(ARRAY[
        jsonb_build_object('value', pct_value, 'context', 'Key figure referenced in the main story.')
      ])
    );
  END IF;

  -- people: stricter check to avoid false positives
  IF jsonb_array_length(COALESCE(NEW.story->'people','[]'::jsonb)) = 0 THEN
    bigram_name := NULL;
    -- Try title colon suffix first
    IF NEW.title ~ ':\s*([A-Z][a-z]+\s[A-Z][a-z]+)' THEN
      bigram_name := substring(NEW.title FROM ':\s*([A-Z][a-z]+\s[A-Z][a-z]+)');
      first_word := split_part(bigram_name, ' ', 1);
      second_word := split_part(bigram_name, ' ', 2);
      is_name := (first_word != ALL(common_bigrams)) AND (second_word != ALL(common_bigrams))
                AND first_word !~ '(ing|ed)$' AND second_word !~ '(ing|ed|s)$';
      IF NOT is_name THEN bigram_name := NULL; END IF;
    END IF;
    -- Try summary bigram
    IF bigram_name IS NULL AND NEW.story->>'summary' IS NOT NULL
       AND NEW.story->>'summary' ~ '\b([A-Z][a-z]+\s[A-Z][a-z]+)\b' THEN
      bigram_name := substring(NEW.story->>'summary' FROM '\b([A-Z][a-z]+\s[A-Z][a-z]+)\b');
      first_word := split_part(bigram_name, ' ', 1);
      second_word := split_part(bigram_name, ' ', 2);
      is_name := (first_word != ALL(common_bigrams)) AND (second_word != ALL(common_bigrams))
                AND first_word !~ '(ing|ed)$' AND second_word !~ '(ing|ed|s)$';
      IF NOT is_name THEN bigram_name := NULL; END IF;
    END IF;

    IF bigram_name IS NOT NULL THEN
      NEW.story := NEW.story || jsonb_build_object(
        'people', to_jsonb(ARRAY[
          jsonb_build_object('name', bigram_name, 'role', 'Mentioned in coverage of ' || COALESCE(NEW.category,'this story'))
        ])
      );
    ELSE
      NEW.story := NEW.story || jsonb_build_object('people', '[]'::jsonb);
    END IF;
  END IF;

  -- organizations
  IF jsonb_array_length(COALESCE(NEW.story->'organizations','[]'::jsonb)) = 0 THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', src->>'name', 'type', 'Source organisation')), '[]'::jsonb)
    INTO src_name
    FROM jsonb_array_elements(COALESCE(NEW.sources,'[]'::jsonb)) AS src;
    NEW.story := NEW.story || jsonb_build_object('organizations', src_name);
  END IF;

  -- countries
  IF jsonb_array_length(COALESCE(NEW.story->'countries','[]'::jsonb)) = 0 THEN
    cc := CASE WHEN NEW.country_code IS NOT NULL AND NEW.country_code <> '' THEN NEW.country_code ELSE 'India' END;
    NEW.story := NEW.story || jsonb_build_object(
      'countries', to_jsonb(ARRAY[
        jsonb_build_object('name', cc, 'relevance', 'Primary geographic context for this article.')
      ])
    );
  END IF;

  -- timeline
  IF jsonb_array_length(COALESCE(NEW.story->'timeline','[]'::jsonb)) = 0 THEN
    NEW.story := NEW.story || jsonb_build_object(
      'timeline', to_jsonb(ARRAY[
        jsonb_build_object(
          'date', to_char(COALESCE(NEW.published_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
          'event', COALESCE(NULLIF(NEW.story->>'summary',''), NEW.title)
        )
      ])
    );
  END IF;

  -- vocabulary: full frontend-ready schema
  IF jsonb_array_length(COALESCE(NEW.story->'vocabulary','[]'::jsonb)) = 0 THEN
    long_word := COALESCE(
      NULLIF(substring(base_text FROM '\b([a-zA-Z]{10,})\b'), ''),
      NULLIF(substring(NEW.title FROM '\b([a-zA-Z]{10,})\b'), ''),
      'development'
    );
    -- lowercase the word for dictionary lookup
    long_word := lower(long_word);
    NEW.story := NEW.story || jsonb_build_object(
      'vocabulary', to_jsonb(ARRAY[
        jsonb_build_object(
          'word', long_word,
          'phonetic', NULL,
          'part_of_speech', 'noun',
          'meaning', 'A term used in this article. See the main story for how it applies here.',
          'example', COALESCE(NULLIF(NEW.story->>'main_story',''), NEW.title),
          'synonyms', '[]'::jsonb,
          'antonyms', '[]'::jsonb
        )
      ])
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;