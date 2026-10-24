-- Remove NOT NULL constraint on sources column
ALTER TABLE articles ALTER COLUMN sources DROP NOT NULL;

-- Clear all external platform URLs from sources
UPDATE articles SET sources = NULL WHERE sources IS NOT NULL;

-- Also clear sources from within the story JSONB field
UPDATE articles SET story = story - 'sources' WHERE story ? 'sources';
