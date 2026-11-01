/*
# Fix cron job maxItems from 30 to 10

The edge function has reduced timeouts (15s per AI provider) and maxItems=10
to avoid exceeding the Supabase edge function wall-clock limit.
The cron function was still passing maxItems=30 which caused timeouts.
*/

CREATE OR REPLACE FUNCTION call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles?maxItems=10',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$;