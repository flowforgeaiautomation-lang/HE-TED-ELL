/*
# Complete rewrite of vocabulary extraction
# Instead of extracting common words from article text, assign curated difficult words
# from vocabulary_cache based on article category
*/

CREATE OR REPLACE FUNCTION extract_difficult_vocabulary(article_text text, article_title text, article_category text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  i integer := 1;
  w text;
  vc_word text;
  vc_pos text;
  vc_meaning text;
  vc_example text;
  vc_pron text;
  vc_syn text[];
  vc_ant text[];
  vc_simple text;
  cat text;
  category_words text[];
  fallback_words text[];
BEGIN
  cat := COALESCE(article_category, 'general');
  
  -- Category-specific difficult words
  category_words := CASE cat
    WHEN 'technology' THEN ARRAY['obfuscate','paradigm','grandiloquent','recalcitrant','perspicacious','machiavellian','recondite','soporific','tendentious','grandstand']
    WHEN 'science' THEN ARRAY['paradigm','recondite','perspicacious','abstruse','desiccate','exegesis','recapitulate','bifurcate','propinquity','sagacious']
    WHEN 'world' THEN ARRAY['hegemony','machavellian','sycophant','hubris','recalcitrant','sedition','calumny','truculent','obsequious','malfeasance']
    WHEN 'politics' THEN ARRAY['machiavellian','hegemony','sycophant','hubris','recalcitrant','sedition','calumny','truculent','obsequious','malfeasance']
    WHEN 'business' THEN ARRAY['malfeasance','obfuscate','grandstand','hubris','magnanimous','inveterate','impecunious','nepotism','perfunctory','vituperative']
    WHEN 'health' THEN ARRAY['palliate','recrudescence','ephemeral','soporific','enervate','fastidious','lachrymose','equanimity','desultory','recondite']
    WHEN 'sport' THEN ARRAY['hubris','magnanimous','recalcitrant','truculent','pugnacious','pusillanimous','grandstand','obstreperous','restive','temerity']
    WHEN 'environment' THEN ARRAY['ephemeral','pernicious','ubiquitous','desiccate','fastidious','sagacious','quiescent','propinquity','vicissitude','recrudescence']
    WHEN 'entertainment' THEN ARRAY['histrionic','maudlin','grandiloquent','ostentatious','effervescent','lambent','lugubrious','apocryphal','fatuous','wistful']
    WHEN 'culture' THEN ARRAY['iconoclast','zeitgeist','quixotic','dilettante','jeremiad','valedictory','exegesis','apocryphal','circumlocution','tergiversation']
    WHEN 'space' THEN ARRAY['recondite','abstruse','quiescent','ephemeral','propinquity','perspicacious','sagacious','verisimilitude','bifurcate','desiccate']
    WHEN 'gaming' THEN ARRAY['obstreperous','truculent','pugnacious','grandstand','effervescent','fastidious','inveterate','hubris','temerity','quixotic']
    WHEN 'artificial-intelligence' THEN ARRAY['obfuscate','paradigm','tendentious','grandiloquent','recondite','perspicacious','abstruse','soporific','grandstand','recalcitrant']
    WHEN 'cricket' THEN ARRAY['hubris','magnanimous','recalcitrant','truculent','pugnacious','pusillanimous','grandstand','obstreperous','restive','temerity']
    WHEN 'football' THEN ARRAY['hubris','magnanimous','recalcitrant','truculent','pugnacious','pusillanimous','grandstand','obstreperous','restive','temerity']
    WHEN 'india' THEN ARRAY['hegemony','sycophant','nepotism','sedition','calumny','obsequious','machavellian','recalcitrant','hubris','malfeasance']
    WHEN 'markets' THEN ARRAY['malfeasance','obfuscate','grandstand','hubris','impecunious','nepotism','perfunctory','vituperative','inveterate','magnanimous']
    WHEN 'movies' THEN ARRAY['histrionic','maudlin','grandiloquent','ostentatious','effervescent','lambent','lugubrious','apocryphal','fatuous','wistful']
    WHEN 'music' THEN ARRAY['mellifluous','cacophony','effervescent','lambent','lugubrious','maudlin','grandiloquent','ostentatious','wistful','apocryphal']
    WHEN 'books' THEN ARRAY['exegesis','iconoclast','zeitgeist','quixotic','dilettante','jeremiad','valedictory','apocryphal','circumlocution','tergiversation']
    WHEN 'climate' THEN ARRAY['ephemeral','pernicious','ubiquitous','desiccate','fastidious','sagacious','quiescent','propinquity','vicissitude','recrudescence']
    ELSE ARRAY['ubiquitous','paradigm','dichotomy','hubris','pernicious','ephemeral','surreptitious','recalcitrant','magnanimous','perspicacious']
  END;
  
  fallback_words := ARRAY['ubiquitous','paradigm','dichotomy','hubris','pernicious','ephemeral','surreptitious','recalcitrant','magnanimous','perspicacious'];
  
  -- Try to get 5 words from category-specific list, looking up in vocabulary_cache
  FOREACH w IN ARRAY category_words LOOP
    IF i > 5 THEN EXIT; END IF;
    
    SELECT word, part_of_speech, meaning, example, pronunciation, synonyms, antonyms, simple_explanation
    INTO vc_word, vc_pos, vc_meaning, vc_example, vc_pron, vc_syn, vc_ant, vc_simple
    FROM vocabulary_cache WHERE vocabulary_cache.word = w LIMIT 1;
    
    IF FOUND THEN
      result := result || to_jsonb(jsonb_build_object(
        'word', vc_word,
        'phonetic', vc_pron,
        'part_of_speech', COALESCE(vc_pos, 'noun'),
        'meaning', vc_meaning,
        'example', COALESCE(vc_example, COALESCE(NULLIF(article_text,''), article_title)),
        'synonyms', to_jsonb(COALESCE(vc_syn, ARRAY[]::text[])),
        'antonyms', to_jsonb(COALESCE(vc_ant, ARRAY[]::text[]))
      ));
      i := i + 1;
    END IF;
  END LOOP;
  
  -- If not enough from category list, use fallback words
  IF i <= 5 THEN
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
          'example', COALESCE(vc_example, COALESCE(NULLIF(article_text,''), article_title)),
          'synonyms', to_jsonb(COALESCE(vc_syn, ARRAY[]::text[])),
          'antonyms', to_jsonb(COALESCE(vc_ant, ARRAY[]::text[]))
        ));
        i := i + 1;
      END IF;
    END LOOP;
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

-- Re-apply to ALL articles with their category
UPDATE articles a
SET story = jsonb_set(a.story, '{vocabulary}', 
  extract_difficult_vocabulary(
    COALESCE(a.story->>'main_story', a.story->>'summary', a.title),
    a.title,
    a.category
  ))
FROM articles a2
WHERE a.slug = a2.slug;