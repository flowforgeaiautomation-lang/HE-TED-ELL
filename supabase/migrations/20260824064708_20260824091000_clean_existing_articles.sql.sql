/*
# Clean Existing Articles — Apply New Vocab/Org/Array Cleanup

## Purpose
Run the upgraded normalize_article_story logic on all existing articles to:
1. Remove vocabulary entries with generic/fake meanings
2. Remove vocabulary entries where the example field is the entire article body
3. Remove source outlet names from organizations
4. Remove source boilerplate from key_facts, key_developments, quick_insights
5. Neutralize source names in sources arrays

## Safety
- No articles deleted, no IDs/URLs changed
- Only cleans text fields within the story JSONB
- Preserves likes, saves, comments, analytics, publication history
*/

DO $$
DECLARE
  total_updated int := 0;
  batch_count int;
BEGIN
  LOOP
    UPDATE articles
    SET updated_at = now()
    WHERE id IN (
      SELECT id FROM articles
      WHERE updated_at < now() - interval '1 second'
      ORDER BY created_at DESC
      LIMIT 200
    );
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    total_updated := total_updated + batch_count;
    EXIT WHEN batch_count = 0;
    PERFORM pg_sleep(0.05);
  END LOOP;
  RAISE NOTICE 'Total articles touched: %', total_updated;
END
$$;