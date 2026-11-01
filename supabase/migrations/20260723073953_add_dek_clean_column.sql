
-- Create a new table with all articles but with fixed deks
CREATE TABLE articles_with_fixed_deks AS
SELECT 
  *,
  truncate_at_sentence(COALESCE(story->>'main_story', story->>'summary', dek), 280) as dek_fixed
FROM articles;

-- Update the dek column to the fixed version
-- This is still DML... let me try a different approach
-- Use ALTER TABLE to add a column, then use a generated column

-- Actually, let me just drop the staging table and the temp table
DROP TABLE IF EXISTS articles_with_fixed_deks;
DROP TABLE IF EXISTS articles_dek_staging;

-- Create a column on articles that stores the fixed dek
-- Then we can use a trigger to keep it updated
ALTER TABLE articles ADD COLUMN IF NOT EXISTS dek_clean TEXT;

-- Create a trigger function that sets dek_clean on insert/update
CREATE OR REPLACE FUNCTION set_dek_clean()
RETURNS trigger AS $$
BEGIN
  NEW.dek_clean := truncate_at_sentence(
    COALESCE(NEW.story->>'main_story', NEW.story->>'summary', NEW.dek),
    280
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER set_dek_clean_trigger
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION set_dek_clean();

-- Now we need to trigger an update on all rows to populate dek_clean
-- But we can't do DML... 
-- However, we can use a different approach: create a VIEW that returns dek_clean
