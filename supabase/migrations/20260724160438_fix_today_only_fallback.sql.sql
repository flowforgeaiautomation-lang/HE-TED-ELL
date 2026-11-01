/*
# Fix list_articles_cursor: graceful today-only fallback

## Problem
The Today page filters with p_today_only=true, returning only articles published
on the current calendar date. When no articles were published today (e.g. the
newest article is from 4 days ago), the page shows an empty state even though
459 articles exist in the database.

## Fix
When p_today_only=true AND zero articles were published today, fall back to
returning the most recent articles regardless of date. This ensures the homepage
is never empty if any articles exist at all.

## Behavior
- If articles published today exist → return only today's articles (cursor-paginated)
- If no articles published today → return most recent articles (cursor-paginated)
- The cursor and hasMore logic remain unchanged
*/

CREATE OR REPLACE FUNCTION list_articles_cursor(
  p_limit int DEFAULT 24,
  p_cursor_date timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_today_only boolean DEFAULT false,
  p_sort text DEFAULT 'recent',
  p_cursor_sort_val text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  dek text,
  category text,
  subcategory text,
  cover_image_url text,
  read_time_minutes int,
  source_count int,
  country_code text,
  featured_slot text,
  published_at timestamptz,
  created_at timestamptz,
  view_count int,
  like_count int,
  bookmark_count int,
  comment_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_count int;
  v_use_today_filter boolean;
BEGIN
  -- When today_only is requested, check if any articles were published today.
  -- If not, fall back to showing the most recent articles so the page is never empty.
  IF p_today_only THEN
    SELECT count(*) INTO v_today_count
    FROM articles
    WHERE is_published = true
      AND published_at >= date_trunc('day', now())
      AND published_at < date_trunc('day', now()) + interval '1 day'
      AND (p_category IS NULL OR category = p_category OR category IN (
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
      ))
      AND (p_country IS NULL OR country_code = p_country);

    v_use_today_filter := v_today_count > 0;
  ELSE
    v_use_today_filter := false;
  END IF;

  RETURN QUERY
  SELECT
    a.id, a.slug, a.title, a.dek, a.category, a.subcategory,
    a.cover_image_url, a.read_time_minutes,
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
    -- Today filter: only apply if articles published today exist
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
$$;

GRANT EXECUTE ON FUNCTION list_articles_cursor TO anon, authenticated;