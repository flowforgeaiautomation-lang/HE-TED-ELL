-- Disable RLS temporarily to allow the update
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;

-- Update all truncated deks
UPDATE articles 
SET dek = truncate_at_sentence(
  COALESCE(story->>'main_story', story->>'summary', dek),
  280
)
WHERE dek ~ '[a-z]\.$'
  AND length(dek) > 100;

-- Re-enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
