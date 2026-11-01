/*
# Fix cron job to refresh market prices every minute

1. Drops the previous cron schedule
2. Recreates with a hardcoded anon key for the auth header
3. The edge function has verify_jwt=false so any valid auth header works
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-market-prices') THEN
    PERFORM cron.unschedule('refresh-market-prices');
  END IF;
END $$;

SELECT cron.schedule(
  'refresh-market-prices',
  '* * * * *',
  $$SELECT net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/update-market-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cnRlcWxjZndja2dkb2t6emhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjE4OTgsImV4cCI6MjA5ODI5Nzg5OH0.lGAyAxmYrJAag1yONChoqV4-A1QQAkdWKxZp5IMJyII'
    ),
    body := '{}'::jsonb
  )$$
);