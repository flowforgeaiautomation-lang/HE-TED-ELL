/*
# Add cover_video_url column to articles

1. Changes
- Adds `cover_video_url` (text, nullable) to the `articles` table.
- This stores a Pexels video URL (mp4) for articles that have relevant video content.
- When null, the article falls back to showing the cover image.
2. Security
- No RLS policy changes needed — the column is readable through existing SELECT policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'cover_video_url'
  ) THEN
    ALTER TABLE articles ADD COLUMN cover_video_url text;
  END IF;
END $$;
