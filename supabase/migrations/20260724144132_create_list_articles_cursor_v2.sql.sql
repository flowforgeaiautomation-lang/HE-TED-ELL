/*
# list_articles_cursor RPC v2 — cursor pagination with sort support

## Purpose
Reliable server-side cursor-based pagination for Today and Discover pages.
Previous PostgREST or() approach broke because ISO timestamps with dots/colons
confused the filter parser, causing duplicate results.

## Function
- `list_articles_cursor(p_limit, p_cursor_date, p_cursor_id, p_category, p_country, p_today_only, p_sort, p_cursor_sort_val)`
  Returns article summary rows ordered by the sort column DESC, id DESC.
  Cursor filtering ensures rows are strictly older than the cursor position.
  Returns p_limit+1 rows so the caller can detect hasMore.

## Cursor format
- recent: "published_at|id" — cursor_date holds the timestamp
- trending: "score|id" — cursor_sort_val holds the numeric trending_score
- most_read: "count|id" — cursor_sort_val holds view_count
- most_saved: "count|id" — cursor_sort_val holds bookmark_count

## Security
- SECURITY DEFINER, read-only, granted to anon + authenticated.
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
BEGIN
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
    AND (
      p_today_only = false
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