
-- Permanent database-level deduplication for articles.
-- Unique normalized title.
CREATE UNIQUE INDEX IF NOT EXISTS articles_unique_norm_title
  ON public.articles (
    lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
  );

-- Unique primary source URL (when present).
CREATE UNIQUE INDEX IF NOT EXISTS articles_unique_source_url
  ON public.articles ((lower(sources->0->>'url')))
  WHERE sources->0->>'url' IS NOT NULL;

-- Unique cover image (prevents the same picture appearing on two stories).
CREATE UNIQUE INDEX IF NOT EXISTS articles_unique_cover_image
  ON public.articles (cover_image_url)
  WHERE cover_image_url IS NOT NULL;
