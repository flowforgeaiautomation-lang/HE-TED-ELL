/*
# Add cron job to backfill article videos

1. Changes
- Adds a cron job that calls the backfill-videos API hook every 5 minutes.
- This will automatically fetch Pexels videos for articles that don't have one yet.
- The cron uses the same pattern as the existing backfill-vocab-cron job.
2. Security
- No RLS changes.
*/

SELECT cron.schedule(
  'backfill-videos-cron',
  '*/5 * * * *',
  $$
SELECT net.http_post(
  url := current_setting('app.functions_url') || '/backfill-videos?limit=15',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
    'apikey', current_setting('app.service_role_key')
  )
);
  $$
);
