-- Add trending_score column for real ranking engine
ALTER TABLE articles ADD COLUMN IF NOT EXISTS trending_score double precision DEFAULT 0;

-- Index for trending sort
CREATE INDEX IF NOT EXISTS idx_articles_trending_score ON articles (trending_score DESC) WHERE is_published = true;

-- Index for most_read sort
CREATE INDEX IF NOT EXISTS idx_articles_view_count ON articles (view_count DESC) WHERE is_published = true;

-- Index for most_saved sort
CREATE INDEX IF NOT EXISTS idx_articles_bookmark_count ON articles (bookmark_count DESC) WHERE is_published = true;

-- Function to update trending scores based on engagement signals + recency
CREATE OR REPLACE FUNCTION update_trending_scores() RETURNS void AS $$
BEGIN
  UPDATE articles SET trending_score = (
    COALESCE(view_count, 0) * 1.0 +
    COALESCE(like_count, 0) * 5.0 +
    COALESCE(bookmark_count, 0) * 10.0 +
    COALESCE(comment_count, 0) * 15.0 +
    CASE
      WHEN published_at > now() - interval '1 hour' THEN 100
      WHEN published_at > now() - interval '6 hours' THEN 50
      WHEN published_at > now() - interval '24 hours' THEN 25
      WHEN published_at > now() - interval '3 days' THEN 10
      WHEN published_at > now() - interval '7 days' THEN 5
      ELSE 0
    END
  ) WHERE is_published = true;
END;
$$ LANGUAGE plpgsql;

-- Run it once to populate initial scores
SELECT update_trending_scores();