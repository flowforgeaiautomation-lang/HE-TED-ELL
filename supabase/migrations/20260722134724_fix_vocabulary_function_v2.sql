-- Fix: the ORDER BY in the subquery needs to be inside the array_agg, not outside
CREATE OR REPLACE FUNCTION public.extract_difficult_vocabulary(article_text text, article_title text, article_category text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $function$
DECLARE
  words text[];
  unique_words text[];
  candidate_words text[];
  w text;
  result jsonb := '[]'::jsonb;
  i integer := 1;
  vc_word text;
  vc_pos text;
  vc_meaning text;
  vc_example text;
  vc_pron text;
  vc_syn text[];
  vc_ant text[];
  vc_simple text;
  used_count integer;
  fallback_word text;
  source_text text;
  fallback_words text[];
BEGIN
  source_text := COALESCE(NULLIF(article_text, ''), NULLIF(article_title, ''));
  IF source_text IS NULL OR source_text = '' THEN
    SELECT word INTO w FROM vocabulary_cache vc
    WHERE NOT EXISTS (SELECT 1 FROM used_vocabulary_words uvw WHERE uvw.word = vc.word)
    ORDER BY random() LIMIT 1;
    IF w IS NOT NULL THEN
      INSERT INTO used_vocabulary_words (word) VALUES (w) ON CONFLICT DO NOTHING;
      RETURN to_jsonb(ARRAY[jsonb_build_object(
        'word', w, 'phonetic', NULL, 'part_of_speech', 'noun',
        'meaning', 'A difficult word from the English language.', 'example', article_title,
        'synonyms', '[]'::jsonb, 'antonyms', '[]'::jsonb
      )]);
    END IF;
    RETURN '[]'::jsonb;
  END IF;

  -- Extract all words from source text, lowercase, alpha only
  words := regexp_split_to_array(lower(regexp_replace(source_text, '[^a-zA-Z\s]', ' ', 'g')), '\s+');

  -- Filter: unique, not common, length >= 7, alpha only
  SELECT array_agg(DISTINCT x) INTO unique_words
  FROM unnest(words) AS x
  WHERE length(x) >= 7
    AND NOT is_common_word(x)
    AND x ~ '^[a-z]+$';

  -- Remove words already used by other articles, sort by length desc
  IF unique_words IS NOT NULL THEN
    SELECT array_agg(y ORDER BY length(y) DESC, y) INTO candidate_words
    FROM unnest(unique_words) AS y
    WHERE NOT EXISTS (SELECT 1 FROM used_vocabulary_words uvw WHERE uvw.word = y);
  END IF;

  -- Pick top 5 candidates, looking up definitions from vocabulary_cache
  IF candidate_words IS NOT NULL THEN
    FOREACH w IN ARRAY candidate_words LOOP
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
          'example', COALESCE(vc_example, source_text),
          'synonyms', to_jsonb(COALESCE(vc_syn, ARRAY[]::text[])),
          'antonyms', to_jsonb(COALESCE(vc_ant, ARRAY[]::text[]))
        ));
      ELSE
        IF length(w) >= 8 THEN
          result := result || to_jsonb(jsonb_build_object(
            'word', w,
            'phonetic', NULL,
            'part_of_speech', 'noun',
            'meaning', 'A term used in this article that may be unfamiliar to some readers.',
            'example', COALESCE(NULLIF(source_text, ''), article_title),
            'synonyms', '[]'::jsonb,
            'antonyms', '[]'::jsonb
          ));
        ELSE
          CONTINUE;
        END IF;
      END IF;

      i := i + 1;
    END LOOP;
  END IF;

  -- If not enough from article text, use unused words from vocabulary_cache
  IF i <= 5 THEN
    fallback_words := ARRAY[
      'aberration','abrogate','apocryphal','bifurcate','cacophony','calumny',
      'circumlocution','depredation','desiccate','desultory','dilettante',
      'effervescent','enervate','ephemeral','equanimity','excrescence',
      'exculpate','exegesis','factitious','fastidious','fatuous','fulminate',
      'garish','grandiloquent','grandstand','hegemony','histrionic','hubris',
      'iconoclast','impecunious','insouciant','inveterate','jejune','jeremiad',
      'juxtapose','kismet','kowtow','lachrymose','lambent','lugubrious',
      'machiavellian','magnanimous','malfeasance','maudlin','mellifluous',
      'miscreant','nepotism','nihilism','obfuscate','obfuscation','obsequious',
      'obstreperous','ostentatious','palliate','paradigm','peregrination',
      'perfunctory','pernicious','perspicacious','propinquity','propitiate',
      'pugnacious','pusillanimous','quagmire','quiescent','quintessential',
      'quixotic','recalcitrance','recalcitrant','recapitulate','recondite',
      'recrudescence','restive','sagacious','sedition','solipsism','soporific',
      'surreptitious','susurration','sycophancy','sycophant','temerity',
      'tendentious','tergiversation','tirade','trenchant','truculent',
      'ubiquitous','undulate','vacillate','valedictory','venerate',
      'verisimilitude','vicarious','vicissitude','vituperative','wheedle',
      'wistful','wunderkind','xenophobia','zealotry','zeitgeist'
    ];
    FOREACH fallback_word IN ARRAY fallback_words LOOP
      IF i > 5 THEN EXIT; END IF;
      IF result @> jsonb_build_array(jsonb_build_object('word', fallback_word)) THEN CONTINUE; END IF;
      SELECT count(*) INTO used_count FROM used_vocabulary_words WHERE word = fallback_word;
      IF used_count > 0 THEN CONTINUE; END IF;

      SELECT word, part_of_speech, meaning, example, pronunciation, synonyms, antonyms, simple_explanation
      INTO vc_word, vc_pos, vc_meaning, vc_example, vc_pron, vc_syn, vc_ant, vc_simple
      FROM vocabulary_cache WHERE vocabulary_cache.word = fallback_word LIMIT 1;

      IF FOUND THEN
        result := result || to_jsonb(jsonb_build_object(
          'word', vc_word,
          'phonetic', vc_pron,
          'part_of_speech', COALESCE(vc_pos, 'noun'),
          'meaning', vc_meaning,
          'example', COALESCE(vc_example, COALESCE(NULLIF(source_text, ''), article_title)),
          'synonyms', to_jsonb(COALESCE(vc_syn, ARRAY[]::text[])),
          'antonyms', to_jsonb(COALESCE(vc_ant, ARRAY[]::text[]))
        ));
        i := i + 1;
      END IF;
    END LOOP;
  END IF;

  -- Register chosen words as used
  FOREACH w IN ARRAY (
    SELECT array_agg(elem->>'word') FROM jsonb_array_elements(result) AS elem
  ) LOOP
    IF w IS NOT NULL THEN
      INSERT INTO used_vocabulary_words (word) VALUES (w) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- If still empty, return at least one word
  IF jsonb_array_length(result) = 0 THEN
    SELECT word INTO w FROM vocabulary_cache vc
    WHERE NOT EXISTS (SELECT 1 FROM used_vocabulary_words uvw WHERE uvw.word = vc.word)
    ORDER BY random() LIMIT 1;
    IF w IS NOT NULL THEN
      INSERT INTO used_vocabulary_words (word) VALUES (w) ON CONFLICT DO NOTHING;
      result := to_jsonb(ARRAY[jsonb_build_object(
        'word', w, 'phonetic', NULL, 'part_of_speech', 'noun',
        'meaning', 'A difficult word from the English language.', 'example', article_title,
        'synonyms', '[]'::jsonb, 'antonyms', '[]'::jsonb
      )]);
    END IF;
  END IF;

  RETURN result;
END;
$function$;
