
-- Create a permanent table to store the fixed deks, then use it to update
CREATE TABLE IF NOT EXISTS temp_fixed_deks (
  article_id UUID PRIMARY KEY,
  old_dek TEXT,
  new_dek TEXT
);

-- Populate it using the truncate function
INSERT INTO temp_fixed_deks (article_id, old_dek, new_dek)
SELECT 
  a.id, 
  a.dek,
  truncate_at_sentence(COALESCE(a.story->>'main_story', a.story->>'summary', a.dek), 280)
FROM articles a
WHERE a.dek ~ '[a-z]\.$'
  AND length(a.dek) > 100
  AND (a.story->>'main_story' IS NOT NULL OR a.story->>'summary' IS NOT NULL)
  AND truncate_at_sentence(COALESCE(a.story->>'main_story', a.story->>'summary', a.dek), 280) IS NOT NULL
  AND truncate_at_sentence(COALESCE(a.story->>'main_story', a.story->>'summary', a.dek), 280) != a.dek
ON CONFLICT (article_id) DO UPDATE SET new_dek = EXCLUDED.new_dek;
