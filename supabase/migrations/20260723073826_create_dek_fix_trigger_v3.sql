
-- Drop the rule - it's too complex and might break things
DROP RULE IF EXISTS fix_dek_on_update ON articles;

-- Drop the function
DROP FUNCTION IF EXISTS execute_dek_fixes();

-- Let's try a simpler approach: create a BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION fix_truncated_dek()
RETURNS trigger AS $$
BEGIN
  IF NEW.dek ~ '[a-z]\.$' AND length(NEW.dek) > 100 THEN
    NEW.dek := truncate_at_sentence(
      COALESCE(NEW.story->>'main_story', NEW.story->>'summary', NEW.dek),
      280
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fix_dek_before_update
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION fix_truncated_dek();
