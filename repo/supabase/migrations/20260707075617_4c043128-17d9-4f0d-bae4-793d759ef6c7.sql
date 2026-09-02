
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_hash text;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_article_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Duplicate article or source URL rejected';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS articles_content_hash_uniq ON public.articles(content_hash) WHERE content_hash IS NOT NULL;
