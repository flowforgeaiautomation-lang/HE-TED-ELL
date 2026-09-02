
-- Let's try using a CTE approach within a CREATE TABLE AS
-- This creates a new table with the fixed data, then we swap

-- Create a staging table with fixed deks
CREATE TABLE IF NOT EXISTS articles_dek_staging AS
SELECT 
  id,
  truncate_at_sentence(COALESCE(story->>'main_story', story->>'summary', dek), 280) as fixed_dek
FROM articles
WHERE dek ~ '[a-z]\.$'
  AND length(dek) > 100
  AND (story->>'main_story' IS NOT NULL OR story->>'summary' IS NOT NULL);

-- Create an index for the join
CREATE INDEX IF NOT EXISTS idx_articles_dek_staging_id ON articles_dek_staging(id);
