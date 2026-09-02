CREATE OR REPLACE FUNCTION public.ensure_article_story_quality()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  source_name text;
  article_summary text;
  published_label text;
BEGIN
  source_name := COALESCE(NEW.sources->0->>'name', 'the original source');
  article_summary := COALESCE(NULLIF(NEW.dek, ''), NEW.title);
  published_label := to_char(COALESCE(NEW.published_at, now()), 'FMMonth DD, YYYY');

  NEW.story := COALESCE(NEW.story, '{}'::jsonb);

  IF NOT (NEW.story ? 'qa') OR jsonb_array_length(COALESCE(NEW.story->'qa', '[]'::jsonb)) < 4 THEN
    NEW.story := NEW.story || jsonb_build_object(
      'qa', jsonb_build_array(
        jsonb_build_object('question', 'What is this article about?', 'answer', concat(NEW.title, '. ', article_summary)),
        jsonb_build_object('question', 'Who reported it?', 'answer', concat(source_name, ' reported this article.')),
        jsonb_build_object('question', 'When was it published?', 'answer', concat('It was published or collected on ', published_label, '.')),
        jsonb_build_object('question', 'What are the main facts?', 'answer', article_summary),
        jsonb_build_object('question', 'Why does it matter?', 'answer', concat('It matters because this article gives a specific update in ', replace(NEW.category, '-', ' '), ' that readers can verify from ', source_name, '.')),
        jsonb_build_object('question', 'What should readers check next?', 'answer', concat('Readers should follow later updates from ', source_name, ' or other primary reports about the same topic.'))
      )
    );
  END IF;

  IF COALESCE(NEW.story->>'what', '') = '' OR NEW.story->>'what' ~* 'original source|the united hell is preserving|broader impact depends|verified new development|reliable, recent information|full primary account|future coverage in this field' THEN
    NEW.story := NEW.story || jsonb_build_object('what', concat(NEW.title, '. ', article_summary));
  END IF;

  IF COALESCE(NEW.story->>'why', '') = '' OR NEW.story->>'why' ~* 'original source|the united hell is preserving|broader impact depends|verified new development|reliable, recent information|full primary account|future coverage in this field' THEN
    NEW.story := NEW.story || jsonb_build_object('why', concat('It matters because this article gives a specific update in ', replace(NEW.category, '-', ' '), ' that readers can verify from ', source_name, '.'));
  END IF;

  IF NOT (NEW.story ? 'key_facts') THEN
    NEW.story := NEW.story || jsonb_build_object('key_facts', jsonb_build_array(NEW.title, article_summary, concat('Source: ', source_name), concat('Published: ', published_label)));
  END IF;

  IF NOT (NEW.story ? 'quick_facts') THEN
    NEW.story := NEW.story || jsonb_build_object('quick_facts', jsonb_build_array(concat('Category: ', replace(NEW.category, '-', ' ')), concat('Source: ', source_name), concat('Date: ', published_label)));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_article_story_quality_trigger ON public.articles;
CREATE TRIGGER ensure_article_story_quality_trigger
BEFORE INSERT OR UPDATE OF title, dek, category, sources, story, published_at ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.ensure_article_story_quality();

CREATE OR REPLACE FUNCTION public.prevent_duplicate_article_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_url text;
  normalized_title text;
BEGIN
  source_url := lower(nullif(NEW.sources->0->>'url', ''));
  normalized_title := lower(regexp_replace(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', ' ', 'g'), '\s+', ' ', 'g'));
  IF EXISTS (
    SELECT 1 FROM public.articles a
    WHERE lower(regexp_replace(regexp_replace(a.title, '[^a-zA-Z0-9]+', ' ', 'g'), '\s+', ' ', 'g')) = normalized_title
       OR (source_url IS NOT NULL AND lower(a.sources->0->>'url') = source_url)
       OR (NEW.cover_image_url IS NOT NULL AND a.cover_image_url = NEW.cover_image_url)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Duplicate article, source URL, or image rejected';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_article_story_quality() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_article_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_article_story_quality() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_duplicate_article_insert() TO service_role;