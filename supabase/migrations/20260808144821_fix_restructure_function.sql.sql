-- Fix: jsonb_set requires path as text array, not just a string
CREATE OR REPLACE FUNCTION restructure_article(article_uuid UUID) RETURNS BOOLEAN AS $$
DECLARE
  art RECORD;
  story_data JSONB;
  new_main_story TEXT;
  new_summary TEXT;
  new_did_you_know TEXT;
  new_future_outlook TEXT;
  new_expert_analysis TEXT;
  new_what_happens_next TEXT;
  new_vocabulary JSONB;
  vocab_item JSONB;
  new_vocab_array JSONB := '[]'::jsonb;
  key_devs TEXT[];
  quick_insights TEXT[];
  para TEXT;
  paragraphs TEXT[] := ARRAY[]::TEXT[];
  bg TEXT;
  wim TEXT;
  hc TEXT;
BEGIN
  SELECT * INTO art FROM articles WHERE id = article_uuid;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  story_data := art.story;
  IF story_data IS NULL THEN RETURN FALSE; END IF;

  new_summary := COALESCE(story_data->>'summary', art.dek);

  -- Start with existing main_story as first paragraph
  para := story_data->>'main_story';
  IF para IS NOT NULL AND LENGTH(TRIM(para)) > 50 THEN
    paragraphs := array_append(paragraphs, TRIM(para));
  END IF;

  -- Add background as a paragraph
  bg := story_data->>'background';
  IF bg IS NOT NULL AND LENGTH(TRIM(bg)) > 50 THEN
    paragraphs := array_append(paragraphs, TRIM(bg));
  END IF;

  -- Add key developments as a paragraph
  IF story_data->'key_developments' IS NOT NULL AND jsonb_typeof(story_data->'key_developments') = 'array' THEN
    key_devs := ARRAY(SELECT jsonb_array_elements_text(story_data->'key_developments'));
    IF array_length(key_devs, 1) > 0 THEN
      paragraphs := array_append(paragraphs, array_to_string(
        (SELECT array_agg('- ' || d) FROM unnest(key_devs) AS d),
        E'\n'
      ));
    END IF;
  END IF;

  -- Add expert analysis as a paragraph (cleaned)
  new_expert_analysis := story_data->>'expert_analysis';
  IF new_expert_analysis IS NOT NULL THEN
    new_expert_analysis := REGEXP_REPLACE(new_expert_analysis, 'Experts in \w+ suggest this development could have significant implications\.?', '', 'gi');
    new_expert_analysis := REGEXP_REPLACE(new_expert_analysis, 'The broader context reveals a pattern that extends beyond this single event, with potential effects on related areas and future developments in \w+\.?', '', 'gi');
    new_expert_analysis := TRIM(new_expert_analysis);
    IF LENGTH(new_expert_analysis) > 50 THEN
      paragraphs := array_append(paragraphs, new_expert_analysis);
    END IF;
  END IF;

  -- Add quick insights as a paragraph
  IF story_data->'quick_insights' IS NOT NULL AND jsonb_typeof(story_data->'quick_insights') = 'array' THEN
    quick_insights := ARRAY(SELECT jsonb_array_elements_text(story_data->'quick_insights'));
    IF array_length(quick_insights, 1) > 0 THEN
      paragraphs := array_append(paragraphs, array_to_string(
        (SELECT array_agg('• ' || q) FROM unnest(quick_insights) AS q),
        E'\n'
      ));
    END IF;
  END IF;

  -- Add why_it_matters as a paragraph (cleaned)
  wim := story_data->>'why_it_matters';
  IF wim IS NOT NULL THEN
    wim := REGEXP_REPLACE(wim, 'This is significant because it affects \w+ and could influence future decisions and outcomes\.?', '', 'gi');
    wim := REGEXP_REPLACE(wim, 'Understanding this story helps readers grasp the wider forces shaping \w+ today\.?', '', 'gi');
    wim := TRIM(wim);
    IF LENGTH(wim) > 50 THEN
      paragraphs := array_append(paragraphs, wim);
    END IF;
  END IF;

  -- Add historical context as a paragraph (cleaned)
  hc := story_data->>'historical_context';
  IF hc IS NOT NULL THEN
    hc := REGEXP_REPLACE(hc, 'This development builds on a longer history of events in \w+\.?', '', 'gi');
    hc := TRIM(hc);
    IF LENGTH(hc) > 50 THEN
      paragraphs := array_append(paragraphs, hc);
    END IF;
  END IF;

  -- Build new main_story
  new_main_story := array_to_string(paragraphs, E'\n\n');

  -- Clean did_you_know
  new_did_you_know := story_data->>'did_you_know';
  IF new_did_you_know IS NOT NULL THEN
    new_did_you_know := REGEXP_REPLACE(new_did_you_know, 'This topic has deep roots in \w+ and connects to other important developments\.?', '', 'gi');
    new_did_you_know := REGEXP_REPLACE(new_did_you_know, 'The story behind this headline reveals interesting connections and context that enriches our understanding of \w+\.?', '', 'gi');
    new_did_you_know := TRIM(new_did_you_know);
    IF LENGTH(new_did_you_know) < 30 THEN
      new_did_you_know := NULL;
    END IF;
  END IF;

  -- Clean future_outlook
  new_future_outlook := story_data->>'future_outlook';
  IF new_future_outlook IS NOT NULL THEN
    new_future_outlook := REGEXP_REPLACE(new_future_outlook, 'Looking forward, this story is likely to develop further as new information emerges\.?', '', 'gi');
    new_future_outlook := REGEXP_REPLACE(new_future_outlook, 'Observers in \w+ will be watching closely for follow-up reports, official responses, and any related developments that could shape the next chapter of this story\.?', '', 'gi');
    new_future_outlook := TRIM(new_future_outlook);
    IF LENGTH(new_future_outlook) < 30 THEN
      new_future_outlook := NULL;
    END IF;
  END IF;

  -- Clean what_happens_next
  new_what_happens_next := story_data->>'what_happens_next';
  IF new_what_happens_next IS NOT NULL THEN
    IF similarity(TRIM(new_what_happens_next), TRIM(new_summary)) > 0.5 THEN
      new_what_happens_next := NULL;
    ELSE
      new_what_happens_next := REGEXP_REPLACE(new_what_happens_next, 'Expect further updates as the situation around .* continues to unfold\.?', '', 'gi');
      new_what_happens_next := TRIM(new_what_happens_next);
      IF LENGTH(new_what_happens_next) < 30 THEN
        new_what_happens_next := NULL;
      END IF;
    END IF;
  END IF;

  -- Clean vocabulary
  IF story_data->'vocabulary' IS NOT NULL AND jsonb_typeof(story_data->'vocabulary') = 'array' THEN
    FOR vocab_item IN SELECT jsonb_array_elements(story_data->'vocabulary') LOOP
      IF vocab_item->>'example' IS NOT NULL AND vocab_item->>'contextInArticle' IS NOT NULL
         AND vocab_item->>'example' = vocab_item->>'contextInArticle' THEN
        vocab_item := vocab_item - 'example';
      END IF;
      IF vocab_item->>'meaning' IS NOT NULL AND vocab_item->>'meaning' ~* '^An important (word|term) used in this story' THEN
        CONTINUE;
      END IF;
      IF vocab_item->>'word' IS NOT NULL AND LENGTH(TRIM(vocab_item->>'word')) > 1 THEN
        new_vocab_array := new_vocab_array || jsonb_build_array(vocab_item);
      END IF;
    END LOOP;
  END IF;

  -- Update the story JSONB using proper path arrays
  story_data := jsonb_set(story_data, ARRAY['main_story'], to_jsonb(new_main_story));
  story_data := jsonb_set(story_data, ARRAY['summary'], to_jsonb(new_summary));

  IF new_did_you_know IS NOT NULL THEN
    story_data := jsonb_set(story_data, ARRAY['did_you_know'], to_jsonb(new_did_you_know));
  ELSE
    story_data := story_data - 'did_you_know';
  END IF;

  IF new_future_outlook IS NOT NULL THEN
    story_data := jsonb_set(story_data, ARRAY['future_outlook'], to_jsonb(new_future_outlook));
  ELSE
    story_data := story_data - 'future_outlook';
  END IF;

  IF new_expert_analysis IS NOT NULL AND LENGTH(new_expert_analysis) > 30 THEN
    story_data := jsonb_set(story_data, ARRAY['expert_analysis'], to_jsonb(new_expert_analysis));
  ELSE
    story_data := story_data - 'expert_analysis';
  END IF;

  IF new_what_happens_next IS NOT NULL THEN
    story_data := jsonb_set(story_data, ARRAY['what_happens_next'], to_jsonb(new_what_happens_next));
  ELSE
    story_data := story_data - 'what_happens_next';
  END IF;

  IF jsonb_array_length(new_vocab_array) > 0 THEN
    story_data := jsonb_set(story_data, ARRAY['vocabulary'], new_vocab_array);
  END IF;

  -- Update the article
  UPDATE articles
  SET story = story_data, reprocessed_at = NOW()
  WHERE id = article_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;