/*
# Fix duplicate articles in pagination — deterministic ordering

451 articles share the same published_at timestamp (2026-06-30). When ordering
by published_at DESC with offset-based pagination, rows with equal timestamps
have no guaranteed order — the database can return the same row on different
pages, causing visible duplicates.

Add composite indexes with id as a tiebreaker so the sort is deterministic.
*/
CREATE INDEX IF NOT EXISTS articles_published_at_id_idx
  ON articles (published_at DESC, id DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS articles_trending_score_id_idx
  ON articles (trending_score DESC, id DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS articles_view_count_id_idx
  ON articles (view_count DESC, id DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS articles_bookmark_count_id_idx
  ON articles (bookmark_count DESC, id DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS articles_category_published_id_idx
  ON articles (category, published_at DESC, id DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS articles_country_published_id_idx
  ON articles (country_code, published_at DESC, id DESC)
  WHERE is_published = true;
