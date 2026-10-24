-- Fix the reprocess cron function to use the correct domain
CREATE OR REPLACE FUNCTION call_reprocess_articles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://www.theunitedhell.in/api/public/hooks/reprocess?limit=50&force=true',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Fix any other cron functions that reference the old domain
DO $$
DECLARE
  fn_record RECORD;
BEGIN
  FOR fn_record IN
    SELECT proname, oid FROM pg_proc WHERE prosrc LIKE '%theunitedhell.com%'
  LOOP
    -- Already fixed call_reprocess_articles above; skip it
    IF fn_record.proname = 'call_reprocess_articles' THEN CONTINUE; END IF;
    
    -- Update the function source to replace the domain
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION %I() RETURNS void LANGUAGE plpgsql AS $BODY$%s$BODY$;',
      fn_record.proname,
      replace(
        replace(
          (SELECT prosrc FROM pg_proc WHERE oid = fn_record.oid),
          'theunitedhell.com',
          'www.theunitedhell.in'
        ),
        '''',
        ''''''
      )
    );
  END LOOP;
END;
$$;
