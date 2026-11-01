-- Fix the reprocess cron to use the correct production domain
-- and increase frequency to every 5 minutes until all articles are done.

-- Unschedule the old cron job
SELECT cron.unschedule('reprocess-articles-every-10min');

-- Update the function to use the correct domain
CREATE OR REPLACE FUNCTION public.call_reprocess_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://theunitedhell.com/api/public/hooks/reprocess?limit=50',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$function$;

-- Reschedule with 5-minute intervals for faster processing
SELECT cron.schedule(
  'reprocess-articles-every-5min',
  '*/5 * * * *',
  'SELECT call_reprocess_articles();'
);
