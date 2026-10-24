-- Fix call_backfill_vocab to use anon key directly (app.service_role_key is not configured)
CREATE OR REPLACE FUNCTION public.call_backfill_vocab()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/backfill-vocab?limit=20',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cnRlcWxjZndja2dkb2t6emhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjE4OTgsImV4cCI6MjA5ODI5Nzg5OH0.lGAyAxmYrJAag1yONChoqV4-A1QQAkdWKxZp5IMJyII'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vocab backfill call failed: %', SQLERRM;
END;
$function$;

-- Fix the backfill-vocab-cron and backfill-videos-cron jobs that reference app.functions_url
-- Unschedule the broken ones and reschedule with direct URLs
SELECT cron.unschedule('backfill-vocab-cron');
SELECT cron.unschedule('backfill-videos-cron');

-- Reschedule with direct edge function URLs
SELECT cron.schedule(
  'backfill-vocab-cron',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/backfill-vocab?limit=20',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cnRlcWxjZndja2dkb2t6emhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjE4OTgsImV4cCI6MjA5ODI5Nzg5OH0.lGAyAxmYrJAag1yONChoqV4-A1QQAkdWKxZp5IMJyII'
    )
  );
  $$
);

SELECT cron.schedule(
  'backfill-videos-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://theunitedhell.com/api/public/hooks/backfill-videos?limit=15',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  $$
);
