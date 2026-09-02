-- Call the function via a DO block
DO $$
DECLARE
  result integer;
BEGIN
  result := apply_staged_dek_fixes();
  RAISE NOTICE 'Updated % rows', result;
END $$;
