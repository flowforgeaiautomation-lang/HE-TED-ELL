
-- Create a function that fixes all truncated deks when called
CREATE OR REPLACE FUNCTION fix_all_truncated_deks()
RETURNS TABLE(updated_count INT, skipped_count INT) AS $$
DECLARE
  rec RECORD;
  new_dek TEXT;
  upd_count INT := 0;
  skp_count INT := 0;
BEGIN
  FOR rec IN 
    SELECT id, dek, story->>'main_story' as main_story, story->>'summary' as summary
    FROM articles
    WHERE dek ~ '[a-z]\.$'
      AND length(dek) > 100
      AND (story->>'main_story' IS NOT NULL OR story->>'summary' IS NOT NULL)
  LOOP
    new_dek := truncate_at_sentence(
      COALESCE(rec.main_story, rec.summary, rec.dek),
      280
    );
    
    IF new_dek IS NOT NULL AND new_dek != rec.dek THEN
      UPDATE articles SET dek = new_dek WHERE id = rec.id;
      upd_count := upd_count + 1;
    ELSE
      skp_count := skp_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT upd_count, skp_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
