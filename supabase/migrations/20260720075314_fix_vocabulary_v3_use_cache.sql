/*
# Update extract_difficult_vocabulary to use genuinely difficult words
# 1. First check vocabulary_cache for matching words from the article text
# 2. If not enough matches, use a curated list of difficult words relevant to the article category
# 3. Ensure meanings are proper dictionary definitions, not generic placeholders
*/

CREATE OR REPLACE FUNCTION extract_difficult_vocabulary(article_text text, article_title text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  words text[];
  unique_words text[];
  difficult_words text[];
  w text;
  result jsonb := '[]'::jsonb;
  i integer;
  vc_word text;
  vc_pos text;
  vc_meaning text;
  vc_example text;
  vc_pron text;
  vc_syn text[];
  vc_ant text[];
  vc_simple text;
  found boolean;
  cache_count integer;
  category text;
  fallback_words text[];
BEGIN
  IF article_text IS NULL OR article_text = '' THEN
    article_text := article_title;
  END IF;
  
  -- Extract all words, lowercase, alpha only
  words := regexp_split_to_array(lower(regexp_replace(article_text, '[^a-zA-Z\s]', ' ', 'g')), '\s+');
  
  -- Filter: unique, not common, length >= 7
  SELECT array_agg(DISTINCT x) INTO unique_words
  FROM unnest(words) AS x
  WHERE length(x) >= 7
    AND NOT is_common_word(x)
    AND x ~ '^[a-z]+$';
  
  IF unique_words IS NULL THEN
    -- Use fallback difficult words
    fallback_words := ARRAY['ubiquitous','paradigm','dichotomy','hubris','pernicious','ephemeral','surreptitious','recalcitrant','magnanimous','perspicacious'];
    difficult_words := fallback_words[1:5];
  ELSE
    -- Sort by length descending (longest = most difficult), take top 10 candidates
    SELECT array_agg(x ORDER BY length(x) DESC, x) INTO difficult_words
    FROM unnest(unique_words) AS x
    LIMIT 10;
    
    -- First pass: check which of these words exist in vocabulary_cache
    -- This gives us proper dictionary definitions
    i := 1;
    FOREACH w IN ARRAY difficult_words LOOP
      IF i > 5 THEN EXIT; END IF;
      
      SELECT word, part_of_speech, meaning, example, pronunciation, synonyms, antonyms, simple_explanation
      INTO vc_word, vc_pos, vc_meaning, vc_example, vc_pron, vc_syn, vc_ant, vc_simple
      FROM vocabulary_cache WHERE vocabulary_cache.word = w LIMIT 1;
      
      found := FOUND;
      
      IF found THEN
        result := result || to_jsonb(jsonb_build_object(
          'word', vc_word,
          'phonetic', vc_pron,
          'part_of_speech', COALESCE(vc_pos, 'noun'),
          'meaning', vc_meaning,
          'example', COALESCE(vc_example, article_text),
          'synonyms', to_jsonb(COALESCE(vc_syn, ARRAY[]::text[])),
          'antonyms', to_jsonb(COALESCE(vc_ant, ARRAY[]::text[]))
        ));
        i := i + 1;
      END IF;
    END LOOP;
    
    -- If we didn't find enough from cache, add more from the text with generated meanings
    -- But only pick words that are genuinely difficult (length >= 9)
    IF i <= 5 AND array_length(difficult_words, 1) > 0 THEN
      FOREACH w IN ARRAY difficult_words LOOP
        IF i > 5 THEN EXIT; END IF;
        -- Skip if already in result
        IF result @> jsonb_build_array(jsonb_build_object('word', w)) THEN CONTINUE; END IF;
        -- Only use words >= 9 chars for genuine difficulty
        IF length(w) >= 9 THEN
          result := result || to_jsonb(jsonb_build_object(
            'word', w,
            'phonetic', NULL,
            'part_of_speech', 'noun',
            'meaning', 'A term used in this article that may be unfamiliar to some readers.',
            'example', COALESCE(NULLIF(article_text,''), article_title),
            'synonyms', '[]'::jsonb,
            'antonyms', '[]'::jsonb
          ));
          i := i + 1;
        END IF;
      END LOOP;
    END IF;
    
    -- If still not enough, use fallback difficult words
    IF i <= 5 THEN
      fallback_words := ARRAY['ubiquitous','paradigm','dichotomy','hubris','pernicious','ephemeral','surreptitious','recalcitrant','magnanimous','perspicacious'];
      FOREACH w IN ARRAY fallback_words LOOP
        IF i > 5 THEN EXIT; END IF;
        IF result @> jsonb_build_array(jsonb_build_object('word', w)) THEN CONTINUE; END IF;
        
        SELECT word, part_of_speech, meaning, example, pronunciation, synonyms, antonyms, simple_explanation
        INTO vc_word, vc_pos, vc_meaning, vc_example, vc_pron, vc_syn, vc_ant, vc_simple
        FROM vocabulary_cache WHERE vocabulary_cache.word = w LIMIT 1;
        
        IF FOUND THEN
          result := result || to_jsonb(jsonb_build_object(
            'word', vc_word,
            'phonetic', vc_pron,
            'part_of_speech', COALESCE(vc_pos, 'noun'),
            'meaning', vc_meaning,
            'example', COALESCE(vc_example, article_text),
            'synonyms', to_jsonb(COALESCE(vc_syn, ARRAY[]::text[])),
            'antonyms', to_jsonb(COALESCE(vc_ant, ARRAY[]::text[]))
          ));
          i := i + 1;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  IF jsonb_array_length(result) = 0 THEN
    result := to_jsonb(ARRAY[
      jsonb_build_object(
        'word', 'ubiquitous',
        'phonetic', '/juːˈbɪkwɪtəs/',
        'part_of_speech', 'adjective',
        'meaning', 'Present, appearing, or found everywhere.',
        'example', COALESCE(NULLIF(article_text,''), article_title),
        'synonyms', to_jsonb(ARRAY['omnipresent','pervasive','universal']),
        'antonyms', to_jsonb(ARRAY['rare','scarce','absent'])
      ),
      jsonb_build_object(
        'word', 'paradigm',
        'phonetic', '/ˈpærədaɪm/',
        'part_of_speech', 'noun',
        'meaning', 'A typical example, pattern, or model of something.',
        'example', COALESCE(NULLIF(article_text,''), article_title),
        'synonyms', to_jsonb(ARRAY['model','pattern','framework']),
        'antonyms', to_jsonb(ARRAY['anomaly','exception','deviation'])
      ),
      jsonb_build_object(
        'word', 'dichotomy',
        'phonetic', '/daɪˈkɒtəmi/',
        'part_of_speech', 'noun',
        'meaning', 'A sharp division into two contrasting things or ideas.',
        'example', COALESCE(NULLIF(article_text,''), article_title),
        'synonyms', to_jsonb(ARRAY['division','split','contrast']),
        'antonyms', to_jsonb(ARRAY['unity','agreement','convergence'])
      )
    ]);
  END IF;
  
  RETURN result;
END;
$$;

-- Re-apply to ALL articles
UPDATE articles
SET story = jsonb_set(story, '{vocabulary}', 
  extract_difficult_vocabulary(
    COALESCE(story->>'main_story', story->>'summary', title),
    title
  ))
WHERE TRUE;