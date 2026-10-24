/*
# Create a single-purpose RPC to get a full article by slug
# This avoids the slow fetch-500-articles approach
# Also recreate get_articles_by_category since the code may reference it
*/

-- 1. get_article_full_by_slug - returns all columns including cover_video_url
CREATE OR REPLACE FUNCTION get_article_full_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
BEGIN
  SELECT row_to_json(t) INTO v_row
  FROM (
    SELECT * FROM articles
    WHERE slug = p_slug AND is_published = true
    LIMIT 1
  ) t;
  
  RETURN v_row;
END;
$$;

-- 2. get_articles_by_category - returns articles filtered by category/country
CREATE OR REPLACE FUNCTION get_articles_by_category(
  p_category TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 24,
  p_today_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
  v_today_start TIMESTAMPTZ;
BEGIN
  IF p_today_only THEN
    v_today_start := date_trunc('day', NOW()) AT TIME ZONE 'UTC';
  END IF;
  
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count, trending_score
    FROM articles
    WHERE is_published = true
      AND (p_category IS NULL OR category = p_category)
      AND (p_country IS NULL OR country_code = p_country)
      AND (v_today_start IS NULL OR published_at >= v_today_start)
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
  
  RETURN v_rows;
END;
$$;

-- 3. get_featured_articles - returns articles with featured_slot
CREATE OR REPLACE FUNCTION get_featured_articles()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count, trending_score
    FROM articles
    WHERE is_published = true
      AND featured_slot IS NOT NULL
    ORDER BY published_at DESC, id DESC
  ) t;
  
  RETURN v_rows;
END;
$$;

-- 4. get_related_articles - returns related articles
CREATE OR REPLACE FUNCTION get_related_articles(
  p_category TEXT,
  p_exclude_slug TEXT,
  p_limit INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count, trending_score
    FROM articles
    WHERE is_published = true
      AND category = p_category
      AND slug != p_exclude_slug
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
  
  RETURN v_rows;
END;
$$;

-- 5. search_articles - search by title/dek/category
CREATE OR REPLACE FUNCTION search_articles(
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 40
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count, trending_score
    FROM articles
    WHERE is_published = true
      AND (title ILIKE p_search_term OR dek ILIKE p_search_term OR category ILIKE p_search_term)
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
  
  RETURN v_rows;
END;
$$;

-- 6. get_briefing_articles - returns latest articles for briefing
CREATE OR REPLACE FUNCTION get_briefing_articles(p_limit INTEGER DEFAULT 80)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count, trending_score
    FROM articles
    WHERE is_published = true
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
  
  RETURN v_rows;
END;
$$;

-- 7. get_briefing_by_category - returns articles filtered by category array
CREATE OR REPLACE FUNCTION get_briefing_by_category(
  p_categories TEXT[],
  p_limit INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count, trending_score
    FROM articles
    WHERE is_published = true
      AND category = ANY(p_categories)
    ORDER BY published_at DESC, id DESC
    LIMIT p_limit
  ) t;
  
  RETURN v_rows;
END;
$$;

-- 8. get_article_by_slug - returns article summary by slug
CREATE OR REPLACE FUNCTION get_article_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
BEGIN
  SELECT row_to_json(t) INTO v_row
  FROM (
    SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
           read_time_minutes, country_code, featured_slot, published_at, created_at,
           view_count, like_count, bookmark_count, comment_count, trending_score
    FROM articles
    WHERE slug = p_slug AND is_published = true
    LIMIT 1
  ) t;
  
  RETURN v_row;
END;
$$;

-- Grant permissions and force PostgREST to reload
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
