/*
# Snapshot article content before AI rewrite

1. New Tables
- `article_story_backup`: copy of each article's id, title, dek, story and category as they were at snapshot time, plus the snapshot timestamp.

2. Security
- Enable RLS on `article_story_backup` with no policies, so anon and authenticated clients cannot read it.
- No grants to anon or authenticated. Only the owner and service-side code can access it.

3. Notes
- Snapshot is taken once; it uses IF NOT EXISTS so re-running the migration does not overwrite an existing snapshot.
- Rows are never updated or deleted by this migration.
*/

CREATE TABLE IF NOT EXISTS article_story_backup (
  article_id uuid PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  title text,
  dek text,
  category text,
  story jsonb,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE article_story_backup ENABLE ROW LEVEL SECURITY;

INSERT INTO article_story_backup (article_id, title, dek, category, story)
SELECT id, title, dek, category, story FROM articles
ON CONFLICT (article_id) DO NOTHING;