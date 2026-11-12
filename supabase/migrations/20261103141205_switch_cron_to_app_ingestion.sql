/*
# Switch cron to use app-side ingestion hook instead of edge function

## Root cause
The edge function's AI provider API keys (deployed as Supabase edge function secrets) are expired/invalid.
Gemini returns HTTP 401 "API key not valid" for all configured keys.
The app-side ingestion pipeline (src/routes/api/public/hooks/ingest.ts) has access to the .env keys
which are deployed with the app on Cloudflare, making it the reliable path for AI generation.

## Changes
- Updates call_fetch_news_articles() to call the app's /api/public/hooks/ingest endpoint
- Uses GET request with maxItems=5 to keep within execution limits
- Increases timeout to 180000ms (3 min) for full pipeline completion
*/

CREATE OR REPLACE FUNCTION public.call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
BEGIN
  PERFORM net.http_get(
    url := 'https://www.theunitedhell.in/api/public/hooks/ingest?maxItems=5',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 180000
  );
END;
$function$;