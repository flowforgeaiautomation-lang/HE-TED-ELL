-- Fix the news ingestion cron to call the app's ingest endpoint directly,
-- bypassing the edge function middleman that was failing to pass AI API keys.
-- The reprocess cron already uses this pattern successfully.

CREATE OR REPLACE FUNCTION call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://www.theunitedhell.in/api/public/hooks/ingest?maxItems=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$;
