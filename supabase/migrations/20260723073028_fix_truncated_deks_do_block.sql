
-- The articles table has an UPDATE policy that requires auth.uid() = user_id
-- The execute_sql and apply_migration tools run as the service role which bypasses RLS.
-- But the apply_migration tool might not be executing UPDATE statements properly.
-- Let me try a different approach: use a DO block to execute the updates.

DO $$
DECLARE
  rec RECORD;
  new_dek TEXT;
BEGIN
  FOR rec IN 
    SELECT id, dek, story->>'main_story' as main_story, story->>'summary' as summary
    FROM articles
    WHERE dek ~ '[a-z]\.$'
      AND (story->>'main_story' IS NOT NULL OR story->>'summary' IS NOT NULL)
      AND length(dek) > 100
  LOOP
    new_dek := truncate_at_sentence(
      COALESCE(rec.main_story, rec.summary, rec.dek),
      280
    );
    
    IF new_dek IS NOT NULL AND new_dek != rec.dek THEN
      UPDATE articles SET dek = new_dek WHERE id = rec.id;
      RAISE NOTICE 'Updated %: %', rec.id, left(new_dek, 50);
    END IF;
  END LOOP;
END $$;
