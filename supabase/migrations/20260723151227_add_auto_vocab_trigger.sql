/*
# Auto-generate vocabulary for new articles on insert

## Purpose
When a new article is inserted, this trigger automatically populates the
vocabulary array in the story JSON by extracting difficult words from the
article text and looking them up in the vocabulary_cache table.

## What it does
1. Creates a function `auto_populate_vocabulary()` that runs AFTER INSERT
   on the articles table
2. Extracts candidate words (7+ chars, not common words) from title + dek + story text
3. Looks up each word in vocabulary_cache for existing definitions
4. Builds a vocabulary array with up to 5 entries
5. Updates the article's story JSON with the vocabulary

## Safety
- Only runs if the article has fewer than 4 vocabulary entries
- Never removes existing vocabulary
- Safe to re-run (idempotent)
*/

CREATE OR REPLACE FUNCTION auto_populate_vocabulary()
RETURNS TRIGGER AS $$
DECLARE
  article_text text;
  candidate_words text[];
  w text;
  vocab_entry jsonb;
  new_vocab jsonb[] := '{}';
  blocked_text text;
BEGIN
  -- Skip if vocabulary already has 4+ entries
  IF NEW.story ? 'vocabulary' AND jsonb_array_length(COALESCE(NEW.story->'vocabulary','[]'::jsonb)) >= 4 THEN
    RETURN NEW;
  END IF;

  blocked_text := ' article source report update people official information development government national regional general several however various whether against already although instead despite further certain because through between another current reported statement including thursday friday wednesday tuesday monday saturday sunday january february march april june july august september october november december according reuters hindustan indian express times india story news world first would could should might years year month week today yesterday tomorrow before after during while about their there these those other which where when what have been were will more most some many such also than only very much well even still since being having without within among across toward towards upon along around behind below above important political economic social public policy policies international domestic foreign local state federal central ministry department agency agencies service services system program programme project projects research study studies researcher scientists professor author writer journalist expert specialist analyst director manager executive officer president minister secretary chairman leader member committee council assembly parliament senate congress court judge justice lawyer attorney company companies corporate corporation business industry market markets financial finance economy growth investment investor investors revenue profit loss budget percent percentage figure figures number numbers data statistics statistic measure measured measures method approach process processes procedure procedures practice practices technique techniques technology technologies technical digital software hardware computer internet online website platform application device equipment machine machines vehicle vehicles aircraft ship ships boat boats train trains plane planes airport railway highway road roads bridge bridges building buildings construction structure structures facility facilities hospital schools college university institute institutes center centre centers centres station stations base bases campus office offices room rooms area areas region regions zone zones district districts province provinces territory territories country countries nation nations capital city cities town towns village villages community communities society societies culture cultural history historical tradition traditional modern ancient classical contemporary present future past recent previous former latter early later middle beginning ending start started starting begin began end ended finish finished complete completed entire whole total full partial half quarter third second seconds minute minutes hour hours day days night nights morning evening afternoon weekend season seasons summer winter spring autumn fall weather climate temperature rain snow wind storm storms cloud clouds sky sun moon star stars planet planets earth space universe galaxy galaxies solar lunar cosmic cosmos energy power powers force forces motion movement movements action actions reaction reactions change changed changing changes transform transformation convert conversion adapt adaptation evolve evolution develop developed developing create created creating creation produce produced producing production product products manufacture manufactured manufacturing design designed designing engineer engineering engineered build built building make made making assemble assembled assembling assembly ';

  -- Build article text
  article_text := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.dek, '') || ' ' || COALESCE(NEW.story->>'summary', '') || ' ' || COALESCE(NEW.story->>'main_story', '') || ' ' || COALESCE(NEW.story->>'background', '') || ' ' || COALESCE(NEW.story->>'expert_analysis', '');

  -- Keep existing vocabulary
  IF NEW.story ? 'vocabulary' THEN
    FOR i IN 0..jsonb_array_length(COALESCE(NEW.story->'vocabulary','[]'::jsonb)) - 1 LOOP
      new_vocab := array_append(new_vocab, NEW.story->'vocabulary'->i);
    END LOOP;
  END IF;

  -- Extract candidate words
  candidate_words := ARRAY(
    SELECT DISTINCT m[1]
    FROM regexp_matches(lower(article_text), '[a-z][a-z-]{6,}', 'g') AS t(m)
    WHERE char_length(m[1]) >= 7
    AND position(' ' || m[1] || ' ' IN blocked_text) = 0
    LIMIT 30
  );

  -- Look up words in vocabulary_cache
  IF candidate_words IS NOT NULL THEN
    FOREACH w IN ARRAY candidate_words LOOP
      EXIT WHEN array_length(new_vocab, 1) >= 5;
      CONTINUE WHEN EXISTS(
        SELECT 1 FROM unnest(new_vocab) AS v
        WHERE lower(v->>'word') = w
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
      WHERE lower(vc.word) = w
      AND vc.meaning IS NOT NULL
      AND vc.meaning != ''
      LIMIT 1;

      IF vocab_entry IS NOT NULL AND vocab_entry->>'meaning' IS NOT NULL THEN
        new_vocab := array_append(new_vocab, vocab_entry);
      END IF;
    END LOOP;
  END IF;

  -- Only update if we found at least 1 new vocabulary entry
  IF array_length(new_vocab, 1) >= 1 AND array_length(new_vocab, 1) >= 4 THEN
    NEW.story := jsonb_set(
      COALESCE(NEW.story, '{}'::jsonb),
      '{vocabulary}',
      to_jsonb(new_vocab)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trigger_auto_populate_vocabulary ON articles;
CREATE TRIGGER trigger_auto_populate_vocabulary
  AFTER INSERT ON articles
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_vocabulary();
