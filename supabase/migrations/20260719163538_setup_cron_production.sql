/*
# Set up pg_cron job for news ingestion every 20 minutes

Note: The database in this sandbox cannot resolve external hostnames, but
this cron job will work in the production Supabase environment. The edge
function fetch-news-articles is deployed and ready to fetch RSS feeds.
*/

-- Grant pg_net access
GRANT USAGE ON SCHEMA net TO postgres;

CREATE OR REPLACE FUNCTION call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/fetch-news-articles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw'
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'fetch-news-articles-every-20min',
  '*/20 * * * *',
  $$SELECT call_fetch_news_articles();$$
);