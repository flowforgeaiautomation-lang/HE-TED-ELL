/*
# Route the 20-minute article cron to the ingestion edge function

1. What changed
- The scheduled job now calls the fetch-news-articles edge function directly instead of the website's ingest route.

2. Why
- The edge function reads AI provider keys from the project's secrets. The website route never received those keys, so every scheduled run used stale or missing keys.

3. Security
- No table, policy, or grant changes.

4. Notes
- The function keeps its existing run logging in the ingestion logs table.
*/

CREATE OR REPLACE FUNCTION public.call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
BEGIN
  PERFORM net.http_get(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles?maxItems=5&triggeredBy=cron',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 170000
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.call_fetch_news_articles() FROM PUBLIC, anon, authenticated;