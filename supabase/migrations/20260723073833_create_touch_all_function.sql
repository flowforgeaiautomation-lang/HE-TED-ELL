
-- Create a function that touches every article (triggers the BEFORE UPDATE)
-- by setting dek = dek (a no-op update that triggers the trigger)
CREATE OR REPLACE FUNCTION touch_all_articles()
RETURNS integer AS $$
DECLARE
  count INTEGER := 0;
BEGIN
  UPDATE articles SET dek = dek WHERE dek ~ '[a-z]\.$' AND length(dek) > 100;
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
