
-- Create a trigger function that fixes truncated deks on SELECT
-- This approach: create a function that updates deks, then call it via a cron schedule or trigger

-- First, create a function that uses EXECUTE to run the update
CREATE OR REPLACE FUNCTION execute_dek_fixes()
RETURNS void AS $$
BEGIN
  UPDATE articles a
  SET dek = t.new_dek
  FROM (
    SELECT 
      a2.id,
      truncate_at_sentence(COALESCE(a2.story->>'main_story', a2.story->>'summary', a2.dek), 280) as new_dek
    FROM articles a2
    WHERE a2.dek ~ '[a-z]\.$'
      AND a2.length(a2.dek) > 100
  ) t
  WHERE a.id = t.id
    AND t.new_dek IS NOT NULL
    AND t.new_dek != a.dek;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires when a row is selected
-- Actually, let's use a different approach: create a view that automatically fixes deks
-- Or better: use an event trigger

-- Let's try: create a rule that rewrites deks
CREATE OR REPLACE RULE fix_dek_on_update AS
  ON UPDATE TO articles
  DO INSTEAD
  UPDATE articles SET
    dek = CASE 
      WHEN NEW.dek ~ '[a-z]\.$' AND length(NEW.dek) > 100 
      THEN truncate_at_sentence(COALESCE(story->>'main_story', story->>'summary', NEW.dek), 280)
      ELSE NEW.dek
    END,
    title = NEW.title,
    slug = NEW.slug,
    category = NEW.category
  WHERE id = OLD.id;
