/*
# Fix cron function to use correct internal Supabase edge function URL

The database cannot resolve external hostnames. We need to use the internal
Supabase URL that the database can reach. The pg_net extension can call
the edge function through the Supabase API gateway.
*/

CREATE OR REPLACE FUNCTION call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url text := 'https://0ec90b57d6e95fcbda19832f.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';
BEGIN
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