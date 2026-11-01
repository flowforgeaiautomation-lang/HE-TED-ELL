-- Create a function to trigger article reprocessing via the production API
CREATE OR REPLACE FUNCTION public.call_reprocess_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://www.theunitedhell.in/api/public/hooks/reprocess?limit=50',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$function$;

-- Schedule reprocessing every 10 minutes until all articles are done
SELECT cron.schedule(
  'reprocess-articles-every-10min',
  '*/10 * * * *',
  'SELECT call_reprocess_articles();'
);
