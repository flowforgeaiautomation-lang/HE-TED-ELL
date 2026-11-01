/*
# Set up pg_cron job to fetch news articles every 20 minutes

1. Purpose
   - Calls the fetch-news-articles edge function every 20 minutes via pg_cron + pg_net
   - This ensures new articles are continuously ingested from RSS feeds
   - The edge function fetches from BBC, Guardian, etc. and inserts articles with full 18-key story structure

2. Changes
   - Creates a function to call the edge function using pg_net
   - Schedules it every 20 minutes with pg_cron

3. Security
   - Uses the service role URL and anon key from environment
   - No new tables or RLS changes
*/

-- Grant pg_net access to the postgres user (needed for HTTP calls)
GRANT USAGE ON SCHEMA net TO postgres;

-- Function to call the edge function
CREATE OR REPLACE FUNCTION call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url text;
  anon_key text;
BEGIN
  edge_url := current_setting('app.supabase_url', true);
  anon_key := current_setting('app.supabase_anon_key', true);
  
  IF edge_url IS NULL OR anon_key IS NULL THEN
    -- Fallback: use the project URL pattern
    edge_url := 'https://0ec90b57d6e95fcbda19832f.supabase.co';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';
  END IF;
  
  -- Call the edge function asynchronously (fire and forget)
  PERFORM net.http_post(
    url := edge_url || '/functions/v1/fetch-news-articles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule the job every 20 minutes
SELECT cron.schedule(
  'fetch-news-articles-every-20min',
  '*/20 * * * *',
  $$SELECT call_fetch_news_articles();$$
);