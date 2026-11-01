
-- Reassign duplicate cover images to unique URLs.
-- For each group of articles sharing the same cover_image_url, keep the first
-- (oldest by published_at) and reassign the rest to unused variant URLs.

DO $$
DECLARE
  dupe_row RECORD;
  article_row RECORD;
  candidate_url TEXT;
  used_urls TEXT[];
  found BOOLEAN;
BEGIN
  -- Iterate over each duplicate image URL
  FOR dupe_row IN
    SELECT cover_image_url
    FROM articles
    WHERE cover_image_url IS NOT NULL
      AND cover_image_url LIKE '%pexels.com%'
    GROUP BY cover_image_url
    HAVING count(*) > 1
  LOOP
    -- Collect all URLs currently in use
    SELECT array_agg(cover_image_url) INTO used_urls
    FROM articles
    WHERE cover_image_url IS NOT NULL;

    -- For each article with this URL except the first (oldest), reassign
    FOR article_row IN
      SELECT id, category
      FROM articles
      WHERE cover_image_url = dupe_row.cover_image_url
      ORDER BY published_at ASC
      OFFSET 1
    LOOP
      candidate_url := NULL;
      found := FALSE;

      -- Look for URLs that appear only once in the DB from same category
      FOR candidate_url IN
        SELECT DISTINCT a2.cover_image_url
        FROM articles a2
        WHERE a2.cover_image_url IS NOT NULL
          AND a2.cover_image_url LIKE '%pexels.com%'
          AND a2.category = article_row.category
          AND a2.cover_image_url <> dupe_row.cover_image_url
          AND a2.cover_image_url <> ALL(COALESCE(used_urls, ARRAY[]::TEXT[]))
        LIMIT 1
      LOOP
        found := TRUE;
        EXIT;
      END LOOP;

      -- If no unused same-category URL, try any unused URL
      IF NOT found THEN
        FOR candidate_url IN
          SELECT DISTINCT a2.cover_image_url
          FROM articles a2
          WHERE a2.cover_image_url IS NOT NULL
            AND a2.cover_image_url LIKE '%pexels.com%'
            AND a2.cover_image_url <> dupe_row.cover_image_url
            AND a2.cover_image_url <> ALL(COALESCE(used_urls, ARRAY[]::TEXT[]))
          LIMIT 1
        LOOP
          found := TRUE;
          EXIT;
        END LOOP;
      END IF;

      -- Last resort: create a variant URL with different dpr parameter
      IF NOT found THEN
        candidate_url := replace(dupe_row.cover_image_url, 'w=1260&h=750', 'w=1260&h=750&dpr=' || (abs(hashtext(article_row.id::text)) % 3 + 1)::text);
        IF candidate_url = ANY(COALESCE(used_urls, ARRAY[]::TEXT[])) THEN
          candidate_url := NULL;
        END IF;
      END IF;

      IF candidate_url IS NOT NULL THEN
        UPDATE articles
        SET cover_image_url = candidate_url
        WHERE id = article_row.id;

        used_urls := array_append(COALESCE(used_urls, ARRAY[]::TEXT[]), candidate_url);
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
