/*
# Cursor-based article pagination RPC

## Purpose
Provides reliable cursor-based pagination for the Today and Discover pages.
The previous approach used PostgREST's `or()` filter with ISO timestamps,
which broke because dots/colons in timestamps confuse the filter parser.
This RPC function performs the cursor comparison server-side in SQL,
guaranteeing correct results.

## New Functions
- `list_articles_cursor(p_limit int, p_cursor_date timestamptz, p_cursor_id uuid, p_category text, p_country text, p_today_only boolean)`
  Returns a set of article summary rows ordered by published_at DESC, id DESC.
  If cursor parameters are provided, returns rows strictly *after* the cursor
  (i.e. older articles). Includes one extra row so the caller can detect
  whether more rows remain.

## Security
- Uses SECURITY DEFINER so the anon-key client can call it.
- Only selects from the articles table (read-only).
- No RLS changes needed — the function is read-only.

## Notes
1. The function returns all summary columns needed by the frontend.
2. When p_cursor_date and p_cursor_id are NULL, returns the first page.
3. The caller checks if returned row count > p_limit to determine hasMore.
4. Ordering is deterministic: published_at DESC, then id DESC (UUIDs are
   unique so there is never a tie).
*/

CREATE OR REPLACE FUNCTION list_articles_cursor(
  p_limit int DEFAULT 24,
  p_cursor_date timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_today_only boolean DEFAULT false
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
    a.cover_image_url, a.read_time_minutes, a.country_code,
    a.featured_slot, a.published_at, a.created_at,
    COALESCE(a.view_count, 0),
    COALESCE(a.like_count, 0),
    COALESCE(a.bookmark_count, 0),
    COALESCE(a.comment_count, 0)
  FROM articles a
  WHERE a.is_published = true
    -- Category filter: match exact category or related categories
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
    -- Country filter
    AND (p_country IS NULL OR a.country_code = p_country)
    -- Today filter
    AND (
      p_today_only = false
      OR a.published_at >= date_trunc('day', now())
    )
    AND (
      p_today_only = false
      OR a.published_at < date_trunc('day', now()) + interval '1 day'
    )
    -- Cursor: return rows strictly older than the cursor position
    AND (
      p_cursor_date IS NULL
      OR p_cursor_id IS NULL
      OR a.published_at < p_cursor_date
      OR (a.published_at = p_cursor_date AND a.id < p_cursor_id)
    )
  ORDER BY a.published_at DESC, a.id DESC
  LIMIT p_limit + 1;
END;
$$;

-- Grant access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION list_articles_cursor TO anon, authenticated;