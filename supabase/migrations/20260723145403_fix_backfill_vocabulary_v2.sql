/*
# Fix backfill_article_vocabulary function v2

Fixes the regexp_matches column type — it returns text[] (a single column
that is itself an array), so we need to unnest it first.
*/

CREATE OR REPLACE FUNCTION backfill_article_vocabulary(batch_limit int DEFAULT 50)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  updated_count int := 0;
  attempted_count int := 0;
  failed_count int := 0;
  remaining_count int := 0;
  article_record RECORD;
  candidate_words text[];
  word text;
  vocab_entry jsonb;
  new_vocab jsonb[] := '{}';
  existing_vocab jsonb;
  article_text text;
  blocked_text text;
BEGIN
  blocked_text := ' article source report update people official information development government national regional general several however various whether against already although instead despite further certain because through between another current reported statement including thursday friday wednesday tuesday monday saturday sunday january february march april june july august september october november december according reuters hindustan indian express times india story news world first would could should might years year month week today yesterday tomorrow before after during while about their there these those other which where when what have been were will more most some many such also than only very much well even still since being having without within among across toward towards upon along around behind below above ';

  SELECT count(*) INTO remaining_count
  FROM articles
  WHERE is_published = true
  AND jsonb_array_length(COALESCE(story->'vocabulary','[]'::jsonb)) < 4;

  FOR article_record IN
    SELECT id, title, dek, story
    FROM articles
    WHERE is_published = true
    AND jsonb_array_length(COALESCE(story->'vocabulary','[]'::jsonb)) < 4
    ORDER BY published_at DESC
    LIMIT batch_limit
  LOOP
    attempted_count := attempted_count + 1;
    new_vocab := '{}';
    existing_vocab := COALESCE(article_record.story->'vocabulary','[]'::jsonb);

    FOR i IN 0..jsonb_array_length(existing_vocab) - 1 LOOP
      new_vocab := array_append(new_vocab, existing_vocab->i);
    END LOOP;

    article_text := COALESCE(article_record.title, '') || ' ' ||
                     COALESCE(article_record.dek, '') || ' ' ||
                     COALESCE(article_record.story->>'summary', '') || ' ' ||
                     COALESCE(article_record.story->>'main_story', '');

    -- Extract candidate words: regexp_matches with 'g' flag returns setof text[]
    -- Each row is a text[] with one element, so we unnest to get individual words
    candidate_words := ARRAY(
      SELECT DISTINCT word_val
      FROM (
        SELECT (row).word_val
        FROM (
          SELECT regexp_matches(lower(article_text), '[a-z][a-z-]{6,}', 'g') AS match_arr
        ) sub1,
        LATERAL (
          SELECT match_arr[1] AS word_val
        ) sub2
      ) words
      WHERE char_length(word_val) >= 7
      AND position(' ' || word_val || ' ' IN blocked_text) = 0
      LIMIT 30
    );

    IF candidate_words IS NOT NULL THEN
      FOREACH word IN ARRAY candidate_words LOOP
        EXIT WHEN array_length(new_vocab, 1) >= 5;
        CONTINUE WHEN EXISTS(
          SELECT 1 FROM jsonb_array_elements(existing_vocab) AS v
          WHERE lower(v->>'word') = word
        );
        SELECT jsonb_build_object(
          'word', vc.word,
          'partOfSpeech', vc.part_of_speech,
          'meaning', vc.meaning,
          'simpleExplanation', vc.simple_explanation,
          'example', vc.example,
          'synonyms', vc.synonyms,
          'antonyms', vc.antonyms,
          'pronunciation', vc.pronunciation
        ) INTO vocab_entry
        FROM vocabulary_cache vc
        WHERE lower(vc.word) = word
        AND vc.meaning IS NOT NULL
        AND vc.meaning != ''
        LIMIT 1;

        IF vocab_entry IS NOT NULL
        AND vocab_entry->>'meaning' IS NOT NULL
        AND vocab_entry->>'word' IS NOT NULL THEN
          new_vocab := array_append(new_vocab, vocab_entry);
        END IF;
      END LOOP;
    END IF;

    IF array_length(new_vocab, 1) >= 4 THEN
      UPDATE articles
      SET story = jsonb_set(
        COALESCE(story, '{}'::jsonb),
        '{vocabulary}',
        to_jsonb(new_vocab)
      )
      WHERE id = article_record.id;
      updated_count := updated_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;

  SELECT count(*) INTO remaining_count
  FROM articles
  WHERE is_published = true
  AND jsonb_array_length(COALESCE(story->'vocabulary','[]'::jsonb)) < 4;

  result := jsonb_build_object(
    'attempted', attempted_count,
    'updated', updated_count,
    'failed', failed_count,
    'remaining', remaining_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
