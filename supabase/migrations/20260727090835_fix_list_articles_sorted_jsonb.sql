/*
# Fix list_articles_sorted to return jsonb instead of json
# The json return type can cause parsing issues with the Supabase JS client
*/

-- Drop and recreate with jsonb return type
DROP FUNCTION IF EXISTS list_articles_sorted(text, integer, uuid, text, boolean) CASCADE;

CREATE OR REPLACE FUNCTION list_articles_sorted(
  p_sort TEXT DEFAULT 'recent',
  p_limit INTEGER DEFAULT 60,
  p_cursor_id UUID DEFAULT NULL,
  p_cursor_val TEXT DEFAULT NULL,
  p_today_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_rows JSONB;
v_has_more BOOLEAN := FALSE;
v_next_cursor TEXT;
v_today_start TIMESTAMPTZ;
v_cursor_num FLOAT := NULL;
v_cursor_date TIMESTAMPTZ := NULL;
v_count INT;
v_last JSONB;
BEGIN
IF p_cursor_val IS NOT NULL THEN
  IF p_sort = 'recent' THEN
    v_cursor_date := p_cursor_val::TIMESTAMPTZ;
  ELSE
    v_cursor_num := p_cursor_val::FLOAT;
  END IF;
END IF;

IF p_today_only THEN
  v_today_start := date_trunc('day', NOW()) AT TIME ZONE 'UTC';
END IF;

IF p_sort = 'trending' THEN
  IF p_cursor_id IS NOT NULL AND v_cursor_num IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
        AND (trending_score < v_cursor_num OR (trending_score = v_cursor_num AND id < p_cursor_id))
      ORDER BY trending_score DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
      ORDER BY trending_score DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  END IF;
ELSIF p_sort = 'most_read' THEN
  IF p_cursor_id IS NOT NULL AND v_cursor_num IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
        AND (view_count < v_cursor_num OR (view_count = v_cursor_num AND id < p_cursor_id))
      ORDER BY view_count DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
      ORDER BY view_count DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  END IF;
ELSIF p_sort = 'most_saved' THEN
  IF p_cursor_id IS NOT NULL AND v_cursor_num IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
        AND (bookmark_count < v_cursor_num OR (bookmark_count = v_cursor_num AND id < p_cursor_id))
      ORDER BY bookmark_count DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
      ORDER BY bookmark_count DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  END IF;
ELSE
  IF p_cursor_id IS NOT NULL AND v_cursor_date IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
        AND (published_at < v_cursor_date OR (published_at = v_cursor_date AND id < p_cursor_id))
      ORDER BY published_at DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT id, slug, title, dek, category, subcategory, cover_image_url, cover_video_url,
             read_time_minutes, country_code, featured_slot, published_at, created_at,
             view_count, like_count, bookmark_count, comment_count, trending_score
      FROM articles
      WHERE is_published = true
        AND (v_today_start IS NULL OR published_at >= v_today_start)
      ORDER BY published_at DESC, id DESC
      LIMIT p_limit + 1
    ) t;
  END IF;
END IF;

v_count := jsonb_array_length(v_rows);
IF v_count > p_limit THEN
  v_has_more := TRUE;
  v_rows := (SELECT jsonb_agg(elem) FROM (
    SELECT elem FROM jsonb_array_elements(v_rows) WITH ORDINALITY AS t(elem, ord) WHERE ord <= p_limit
  ) sub);
  v_count := p_limit;
END IF;

IF v_has_more AND v_count > 0 THEN
  v_last := v_rows->(v_count - 1);
  IF p_sort = 'recent' THEN
    v_next_cursor := (v_last->>'published_at') || '|' || (v_last->>'id');
  ELSIF p_sort = 'trending' THEN
    v_next_cursor := COALESCE(v_last->>'trending_score', '0') || '|' || (v_last->>'id');
  ELSIF p_sort = 'most_read' THEN
    v_next_cursor := COALESCE(v_last->>'view_count', '0') || '|' || (v_last->>'id');
  ELSIF p_sort = 'most_saved' THEN
    v_next_cursor := COALESCE(v_last->>'bookmark_count', '0') || '|' || (v_last->>'id');
  END IF;
END IF;

RETURN jsonb_build_object(
  'items', v_rows,
  'hasMore', v_has_more,
  'nextCursor', COALESCE(v_next_cursor, NULL)
);
END;
$$;

-- Also fix list_articles_cursor to be more robust
DROP FUNCTION IF EXISTS list_articles_cursor(integer, timestamp with time zone, uuid, text, text, boolean, text, text) CASCADE;

CREATE OR REPLACE FUNCTION list_articles_cursor(
  p_limit INTEGER DEFAULT 24,
  p_cursor_date TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_today_only BOOLEAN DEFAULT false,
  p_sort TEXT DEFAULT 'recent',
  p_cursor_sort_val TEXT DEFAULT NULL
)
RETURNS TABLE(
  id uuid, slug text, title text, dek text, category text, subcategory text,
  cover_image_url text, cover_video_url text, read_time_minutes integer,
  source_count integer, country_code text, featured_slot text,
  published_at timestamp with time zone, created_at timestamp with time zone,
  view_count integer, like_count integer, bookmark_count integer, comment_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.slug, a.title, a.dek, a.category, a.subcategory,
         a.cover_image_url, a.cover_video_url, a.read_time_minutes,
         COALESCE(a.source_count, 0), a.country_code, a.featured_slot,
         a.published_at, a.created_at, a.view_count, a.like_count,
         a.bookmark_count, a.comment_count
  FROM articles a
  WHERE a.is_published = true
    AND (p_category IS NULL OR a.category = p_category)
    AND (p_country IS NULL OR a.country_code = p_country)
    AND (p_today_only = false OR a.published_at >= date_trunc('day', NOW()) AT TIME ZONE 'UTC')
    AND (
      p_cursor_date IS NULL OR
      (a.published_at < p_cursor_date OR (a.published_at = p_cursor_date AND a.id < p_cursor_id))
    )
  ORDER BY a.published_at DESC, a.id DESC
  LIMIT p_limit;
END;
$$;

NOTIFY pgrst, 'reload schema';
