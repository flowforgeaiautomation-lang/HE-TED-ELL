-- Create a tracking table for used vocabulary words to prevent repetition
CREATE TABLE IF NOT EXISTS used_vocabulary_words (
  word text PRIMARY KEY,
  article_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE used_vocabulary_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_used_vocab" ON used_vocabulary_words FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_used_vocab" ON used_vocabulary_words FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_used_vocab" ON used_vocabulary_words FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_used_vocab" ON used_vocabulary_words FOR DELETE TO anon, authenticated USING (true);

-- Rewrite extract_difficult_vocabulary(text,text,text) to:
-- 1. Extract candidate words from the actual article text
-- 2. Exclude words already used by other articles
-- 3. Look up definitions from vocabulary_cache
-- 4. For words not in cache, generate a basic entry
-- 5. Register chosen words as used
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
  cache_count integer;
  fallback_words text[];
  fallback_word text;
  source_text text;
BEGIN
  -- Use article text, or fall back to title
  source_text := COALESCE(NULLIF(article_text, ''), NULLIF(article_title, ''));
  IF source_text IS NULL OR source_text = '' THEN
    -- Last resort: pick unused words from vocabulary_cache
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

  -- Remove words already used by other articles
  IF unique_words IS NOT NULL THEN
    SELECT array_agg(y) INTO candidate_words
    FROM unnest(unique_words) AS y
    WHERE NOT EXISTS (SELECT 1 FROM used_vocabulary_words uvw WHERE uvw.word = y)
    ORDER BY length(y) DESC, y;
  END IF;

  -- Pick top 5 candidates, looking up definitions from vocabulary_cache
  IF candidate_words IS NOT NULL THEN
    FOREACH w IN ARRAY candidate_words LOOP
      IF i > 5 THEN EXIT; END IF;

      SELECT word, part_of_speech, meaning, example, pronunciation, synonyms, antonyms, simple_explanation
      INTO vc_word, vc_pos, vc_meaning, vc_example, vc_pron, vc_syn, vc_ant, vc_simple
      FROM vocabulary_cache WHERE vocabulary_cache.word = w LIMIT 1;

      IF FOUND THEN
        -- Word is in cache, use proper definition
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
        -- Word not in cache but is a genuine difficult word from the article
        -- Only include if length >= 8 (genuinely difficult)
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
    FOREACH fallback_word IN ARRAY ARRAY[
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
    ] LOOP
      IF i > 5 THEN EXIT; END IF;
      -- Skip if already in result
      IF result @> jsonb_build_array(jsonb_build_object('word', fallback_word)) THEN CONTINUE; END IF;
      -- Skip if already used by another article
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
