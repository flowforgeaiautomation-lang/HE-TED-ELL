-- Fix the backfill-videos-cron job that still points to the old .com domain
SELECT cron.unschedule('backfill-videos-cron');

SELECT cron.schedule(
  'backfill-videos-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.theunitedhell.in/api/public/hooks/backfill-videos?limit=15',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  $$
);