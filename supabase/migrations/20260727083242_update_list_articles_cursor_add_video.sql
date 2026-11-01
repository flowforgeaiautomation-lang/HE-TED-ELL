/*
# Update list_articles_cursor RPC to include cover_video_url

1. Changes
- Drops and recreates `list_articles_cursor` to include `cover_video_url` in the return table.
2. Security
- No RLS changes — the function is SECURITY DEFINER and already accessible.
*/

DROP FUNCTION IF EXISTS public.list_articles_cursor(
  integer, timestamp with time zone, uuid, text, text, boolean, text, text
);

CREATE FUNCTION public.list_articles_cursor(
  p_limit integer DEFAULT 24,
  p_cursor_date timestamp with time zone DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_today_only boolean DEFAULT false,
  p_sort text DEFAULT 'recent',
  p_cursor_sort_val text DEFAULT NULL
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
AS $function$
DECLARE
  v_today_count int;
  v_use_today_filter boolean;
BEGIN
  IF p_today_only THEN
    SELECT count(*) INTO v_today_count
    FROM articles art
    WHERE art.is_published = true
    AND art.published_at >= date_trunc('day', now())
    AND art.published_at < date_trunc('day', now()) + interval '1 day'
    AND (
      p_category IS NULL
      OR art.category = p_category
      OR art.category IN (
        SELECT unnest(string_to_array(
          CASE p_category
          WHEN 'world' THEN 'world,geopolitics,global-affairs,politics'
          WHEN 'science' THEN 'science,physics,biology,genetics,neuroscience,medicine,research'
          WHEN 'technology' THEN 'technology,artificial-intelligence,software,hardware,innovation,future-technology'
          WHEN 'space' THEN 'space,astronomy,space-missions,exoplanets'
          WHEN 'health' THEN 'health,fitness,nutrition,wellness,medicine'
          WHEN 'nature' THEN 'wildlife,nature,marine-life,ocean-exploration,conservation'
          WHEN 'history' THEN 'archaeology,ancient-civilizations,historical-mysteries'
          WHEN 'sports' THEN 'cricket,football,olympics'
          WHEN 'entertainment' THEN 'movies,music,gaming,celebrities,web-series'
          WHEN 'climate' THEN 'climate,renewable-energy,sustainability,nuclear-energy'
          WHEN 'business' THEN 'billionaires,entrepreneurs,startups,investing,markets,economics,personal-finance,business-leaders'
          WHEN 'india' THEN 'india'
          ELSE p_category
          END, ','
        ))
      )
    )
    AND (p_country IS NULL OR art.country_code = p_country);

    v_use_today_filter := v_today_count > 0;
  ELSE
    v_use_today_filter := false;
  END IF;

  RETURN QUERY
  SELECT
    a.id, a.slug, a.title, a.dek, a.category, a.subcategory,
    a.cover_image_url, a.cover_video_url, a.read_time_minutes,
    COALESCE(a.source_count, 1),
    a.country_code, a.featured_slot, a.published_at, a.created_at,
    COALESCE(a.view_count, 0),
    COALESCE(a.like_count, 0),
    COALESCE(a.bookmark_count, 0),
    COALESCE(a.comment_count, 0)
  FROM articles a
  WHERE a.is_published = true
  AND (
    p_category IS NULL
    OR a.category = p_category
    OR a.category IN (
      SELECT unnest(string_to_array(
        CASE p_category
        WHEN 'world' THEN 'world,geopolitics,global-affairs,politics'
        WHEN 'science' THEN 'science,physics,biology,genetics,neuroscience,medicine,research'
        WHEN 'technology' THEN 'technology,artificial-intelligence,software,hardware,innovation,future-technology'
        WHEN 'space' THEN 'space,astronomy,space-missions,exoplanets'
        WHEN 'health' THEN 'health,fitness,nutrition,wellness,medicine'
        WHEN 'nature' THEN 'wildlife,nature,marine-life,ocean-exploration,conservation'
        WHEN 'history' THEN 'archaeology,ancient-civilizations,historical-mysteries'
        WHEN 'sports' THEN 'cricket,football,olympics'
        WHEN 'entertainment' THEN 'movies,music,gaming,celebrities,web-series'
        WHEN 'climate' THEN 'climate,renewable-energy,sustainability,nuclear-energy'
        WHEN 'business' THEN 'billionaires,entrepreneurs,startups,investing,markets,economics,personal-finance,business-leaders'
        WHEN 'india' THEN 'india'
        ELSE p_category
        END, ','
      ))
    )
  )
  AND (p_country IS NULL OR a.country_code = p_country)
  AND (
    NOT v_use_today_filter
    OR (a.published_at >= date_trunc('day', now()) AND a.published_at < date_trunc('day', now()) + interval '1 day')
  )
  AND (
    p_cursor_id IS NULL
    OR (
      p_sort = 'recent' AND (
        a.published_at < p_cursor_date
        OR (a.published_at = p_cursor_date AND a.id < p_cursor_id)
      )
    )
    OR (
      p_sort = 'trending' AND (
        COALESCE(a.trending_score, 0) < p_cursor_sort_val::numeric
        OR (COALESCE(a.trending_score, 0) = p_cursor_sort_val::numeric AND a.id < p_cursor_id)
      )
    )
    OR (
      p_sort = 'most_read' AND (
        COALESCE(a.view_count, 0) < p_cursor_sort_val::int
        OR (COALESCE(a.view_count, 0) = p_cursor_sort_val::int AND a.id < p_cursor_id)
      )
    )
    OR (
      p_sort = 'most_saved' AND (
        COALESCE(a.bookmark_count, 0) < p_cursor_sort_val::int
        OR (COALESCE(a.bookmark_count, 0) = p_cursor_sort_val::int AND a.id < p_cursor_id)
      )
    )
  )
  ORDER BY
    CASE WHEN p_sort = 'trending' THEN COALESCE(a.trending_score, 0) END DESC,
    CASE WHEN p_sort = 'most_read' THEN COALESCE(a.view_count, 0) END DESC,
    CASE WHEN p_sort = 'most_saved' THEN COALESCE(a.bookmark_count, 0) END DESC,
    CASE WHEN p_sort = 'recent' THEN a.published_at END DESC,
    a.id DESC
  LIMIT p_limit + 1;
END;
$function$;
