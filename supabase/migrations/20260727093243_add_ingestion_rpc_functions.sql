/*
# Create RPC functions for ingestion to avoid PostgREST schema cache issues
*/

-- RPC to get articles missing video URLs
CREATE OR REPLACE FUNCTION get_articles_missing_video(p_limit INTEGER DEFAULT 20)
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
    SELECT id, title, category, cover_image_url, cover_video_url
    FROM articles
    WHERE cover_video_url IS NULL
      AND is_published = true
    ORDER BY published_at DESC
    LIMIT p_limit
  ) t;
  
  RETURN v_rows;
END;
$$;

-- RPC to update cover_video_url for an article
CREATE OR REPLACE FUNCTION update_cover_video_url(p_article_id UUID, p_video_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE articles SET cover_video_url = p_video_url WHERE id = p_article_id;
  RETURN FOUND;
END;
$$;

-- RPC to count articles missing video URLs
CREATE OR REPLACE FUNCTION count_articles_missing_video()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM articles
  WHERE cover_video_url IS NULL
    AND is_published = true;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
