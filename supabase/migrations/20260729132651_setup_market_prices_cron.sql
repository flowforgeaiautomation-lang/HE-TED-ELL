/*
# Set up cron job to refresh market prices every minute

1. Schedules the update-market-prices edge function to run every minute
2. Uses pg_cron extension
*/

-- Drop existing cron if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-market-prices') THEN
    PERFORM cron.unschedule('refresh-market-prices');
  END IF;
END $$;

-- Schedule the edge function to run every minute
SELECT cron.schedule(
  'refresh-market-prices',
  '* * * * *',
  $$SELECT net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/update-market-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decoded->>'role' FROM (SELECT auth.jwt() AS decoded) AS t)
    ),
    body := '{}'::jsonb
  )$$
);