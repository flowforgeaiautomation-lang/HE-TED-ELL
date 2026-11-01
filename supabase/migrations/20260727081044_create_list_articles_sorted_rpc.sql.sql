-- Create an RPC function to list articles by sort order
-- This bypasses PostgREST schema cache issues with trending_score
CREATE OR REPLACE FUNCTION list_articles_sorted(
  p_sort TEXT DEFAULT 'recent',
  p_limit INT DEFAULT 60,
  p_cursor_id UUID DEFAULT NULL,
  p_cursor_val TEXT DEFAULT NULL,
  p_today_only BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_rows JSON;
  v_has_more BOOLEAN := FALSE;
  v_next_cursor TEXT;
  v_today_start TIMESTAMPTZ;
  v_cursor_num FLOAT := NULL;
  v_cursor_date TIMESTAMPTZ := NULL;
BEGIN
  -- Parse cursor value
  IF p_cursor_val IS NOT NULL THEN
    IF p_sort = 'recent' THEN
      v_cursor_date := p_cursor_val::TIMESTAMPTZ;
    ELSE
      v_cursor_num := p_cursor_val::FLOAT;
    END IF;
  END IF;

  -- Today-only filter
  IF p_today_only THEN
    v_today_start := date_trunc('day', NOW()) AT TIME ZONE 'UTC';
  END IF;

  -- Fetch articles with appropriate sorting
  IF p_sort = 'trending' THEN
    IF p_cursor_id IS NOT NULL AND v_cursor_num IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
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
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
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
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
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
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
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
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
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
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
               read_time_minutes, country_code, featured_slot, published_at, created_at,
               view_count, like_count, bookmark_count, comment_count, trending_score
        FROM articles
        WHERE is_published = true
          AND (v_today_start IS NULL OR published_at >= v_today_start)
        ORDER BY bookmark_count DESC, id DESC
        LIMIT p_limit + 1
      ) t;
    END IF;
  ELSE -- recent
    IF p_cursor_id IS NOT NULL AND v_cursor_date IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
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
        SELECT id, slug, title, dek, category, subcategory, cover_image_url,
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

  -- Check if we have more rows
  v_rows := v_rows::jsonb;
  IF jsonb_array_length(v_rows) > p_limit THEN
    v_has_more := TRUE;
    v_rows := (SELECT jsonb_agg(elem) FROM (
      SELECT elem FROM jsonb_array_elements(v_rows) WITH ORDINALITY AS t(elem, ord) WHERE ord <= p_limit
    ) sub);
  END IF;

  -- Build next cursor
  IF v_has_more AND jsonb_array_length(v_rows) > 0 THEN
    DECLARE
      v_last JSON;
    BEGIN
      v_last := v_rows->(jsonb_array_length(v_rows) - 1);
      IF p_sort = 'recent' THEN
        v_next_cursor := (v_last->>'published_at') || '|' || (v_last->>'id');
      ELSIF p_sort = 'trending' THEN
        v_next_cursor := COALESCE(v_last->>'trending_score', '0') || '|' || (v_last->>'id');
      ELSIF p_sort = 'most_read' THEN
        v_next_cursor := COALESCE(v_last->>'view_count', '0') || '|' || (v_last->>'id');
      ELSIF p_sort = 'most_saved' THEN
        v_next_cursor := COALESCE(v_last->>'bookmark_count', '0') || '|' || (v_last->>'id');
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'items', v_rows,
    'hasMore', v_has_more,
    'nextCursor', COALESCE(v_next_cursor, NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;