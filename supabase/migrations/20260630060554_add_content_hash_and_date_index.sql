-- Add content_hash column for SHA256 duplicate prevention
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_hash text;

-- Index for fast duplicate lookups
CREATE UNIQUE INDEX IF NOT EXISTS articles_content_hash_idx ON articles(content_hash) WHERE content_hash IS NOT NULL;

-- Index for fast date ordering (created_at is accurate, published_at may be from source)
CREATE INDEX IF NOT EXISTS articles_created_at_idx ON articles(created_at DESC);

-- Make published_at default to NOW() so new articles always have accurate time
ALTER TABLE articles ALTER COLUMN published_at SET DEFAULT now();
