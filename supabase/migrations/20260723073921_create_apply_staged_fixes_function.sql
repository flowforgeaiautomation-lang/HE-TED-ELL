
-- Create a function that updates articles from the staging table
-- Using SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION apply_staged_dek_fixes()
RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE articles a
  SET dek = s.fixed_dek
  FROM articles_dek_staging s
  WHERE a.id = s.id
    AND s.fixed_dek IS NOT NULL
    AND s.fixed_dek != a.dek;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Drop the staging table
  DROP TABLE IF EXISTS articles_dek_staging;
  
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
