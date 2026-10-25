/*
# Add RPC functions that bypass PostgREST schema cache issues

1. Changes
- get_featured_articles: returns featured articles with cover_video_url
- get_related_articles: returns related articles by category with cover_video_url
- search_articles: searches articles with cover_video_url
- get_articles_by_category: returns articles filtered by category with cover_video_url
- get_briefing_articles: returns latest articles for briefing with cover_video_url
- All functions bypass PostgREST schema cache by using direct SQL
2. Security
- SECURITY DEFINER so it can read all published articles
- No RLS changes
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_featured_articles() CASCADE;
DROP FUNCTION IF EXISTS get_related_articles(p_category TEXT, p_exclude_slug TEXT, p_limit INT) CASCADE;
DROP FUNCTION IF EXISTS search_articles(p_search_term TEXT, p_limit INT) CASCADE;
DROP FUNCTION IF EXISTS get_articles_by_category(p_category TEXT, p_country TEXT, p_limit INT, p_today_only BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_briefing_articles(p_limit INT) CASCADE;
DROP FUNCTION IF EXISTS get_briefing_by_category(p_categories TEXT[], p_limit INT) CASCADE;

-- Get featured articles
CREATE OR REPLACE FUNCTION get_featured_articles()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count
    FROM articles
    WHERE is_published = true
      AND featured_slot IS NOT NULL
    ORDER BY published_at DESC, id DESC
  ) t;
$$;

-- Get related articles by category (excluding one slug)
CREATE OR REPLACE FUNCTION get_related_articles(p_category TEXT, p_exclude_slug TEXT, p_limit INT DEFAULT 6)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count
    FROM articles
    WHERE is_published = true
      AND category = p_category
      AND slug != p_exclude_slug
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
$$;

-- Search articles
CREATE OR REPLACE FUNCTION search_articles(p_search_term TEXT, p_limit INT DEFAULT 40)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count
    FROM articles
    WHERE is_published = true
      AND (title ILIKE p_search_term OR dek ILIKE p_search_term OR category ILIKE p_search_term)
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
$$;

-- Get articles by category (with optional country filter)
CREATE OR REPLACE FUNCTION get_articles_by_category(
  p_category TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_limit INT DEFAULT 24,
  p_today_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count
    FROM articles
    WHERE is_published = true
      AND (p_category IS NULL OR category = p_category)
      AND (p_country IS NULL OR country_code = p_country)
      AND (p_today_only = FALSE OR published_at >= date_trunc('day', NOW()) AT TIME ZONE 'UTC')
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
$$;

-- Get latest articles for briefing
CREATE OR REPLACE FUNCTION get_briefing_articles(p_limit INT DEFAULT 80)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count
    FROM articles
    WHERE is_published = true
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
$$;

-- Get briefing articles by category list
CREATE OR REPLACE FUNCTION get_briefing_by_category(p_categories TEXT[], p_limit INT DEFAULT 6)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count
    FROM articles
    WHERE is_published = true
      AND category = ANY(p_categories)
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
$$;

-- Get article by slug (full article with all fields)
CREATE OR REPLACE FUNCTION get_article_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(t)
  FROM (
    SELECT *
    FROM articles
    WHERE slug = p_slug
      AND is_published = true
    LIMIT 1
  ) t;
$$;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
