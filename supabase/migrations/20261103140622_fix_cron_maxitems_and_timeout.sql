/*
# Fix cron ingestion function: reduce maxItems to 5, increase timeout

## Changes
- Updates `call_fetch_news_articles()` to use `maxItems=5` (was 10) to stay within edge function execution limits
- Increases `net.http_post` timeout from 120000ms (2 min) to 180000ms (3 min) to allow full pipeline completion
- Adds `triggeredBy=cron` parameter for monitoring traceability

## Root cause
The edge function was processing 10 articles sequentially, each requiring AI generation (15-20s) plus image search (8s), totaling 230s+. The cron's 120s timeout killed the request before completion, and since net.http_post is fire-and-forget, the failure was invisible.
*/

CREATE OR REPLACE FUNCTION public.call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles?maxItems=5&triggeredBy=cron',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  );
END;
$function$;