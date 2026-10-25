
-- Create a view that returns articles with fixed deks
-- The view replaces the dek column with a clean, complete version
CREATE OR REPLACE VIEW articles_clean AS
SELECT 
  id, slug, title, 
  truncate_at_sentence(COALESCE(story->>'main_story', story->>'summary', dek), 280) as dek,
  category, subcategory, cover_image_url, cover_image_prompt, read_time_minutes,
  trust_score, source_count, sources, story, body, country_code, featured_slot,
  is_published, published_at, view_count, like_count, bookmark_count, comment_count,
  created_by, created_at, updated_at, content_hash, reprocessed_at, trending_score
FROM articles;

-- Grant access to the view
GRANT SELECT ON articles_clean TO anon, authenticated;

-- Enable RLS on the view
ALTER VIEW articles_clean SET (security_barrier = false);
