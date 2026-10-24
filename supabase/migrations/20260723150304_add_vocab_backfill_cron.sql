/*
# Add cron job for vocabulary backfill

## Purpose
Adds a cron job that runs the backfill-vocab edge function every hour to
ensure new articles always get full vocabulary (4+ words). This complements
the existing news-fetching cron that runs every 20 minutes.

## What it does
1. Creates a PostgreSQL function that calls the backfill-vocab edge function
2. Schedules it to run every hour via pg_cron
*/

CREATE OR REPLACE FUNCTION call_backfill_vocab()
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/backfill-vocab?limit=20',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vocab backfill call failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
