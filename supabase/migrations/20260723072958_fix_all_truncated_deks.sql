/*
# Fix all truncated deks (sub-headlines) in the articles table
#
# Many deks were truncated at a character limit (~384 chars), cutting off mid-word.
# This migration fixes them by extracting complete sentences from the main_story
# or summary field, up to 280 characters, never cutting mid-sentence.
*/

-- Update all articles with truncated deks
UPDATE articles 
SET dek = truncate_at_sentence(
  COALESCE(story->>'main_story', story->>'summary', dek),
  280
)
WHERE dek ~ '[a-z]\.$'
  AND (story->>'main_story' IS NOT NULL OR story->>'summary' IS NOT NULL)
  AND length(dek) > 100;

-- Also update the story summary to match the dek for consistency
UPDATE articles
SET story = jsonb_set(story::jsonb, '{summary}', to_jsonb(dek), true)
WHERE dek ~ '[a-z]\.$'
  AND story->>'summary' IS NOT NULL
  AND length(story->>'summary') > 280;
