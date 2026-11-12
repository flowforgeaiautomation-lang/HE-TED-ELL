/*
# Increase automated news ingestion request timeout

1. Purpose
- The scheduled news-ingestion job was using pg_net's default 5-second HTTP timeout.
- The ingestion function legitimately needs longer because it retrieves multiple sources, generates original articles, and validates images.

2. Modified database objects
- Replaces `call_fetch_news_articles()` with the same endpoint and schedule behavior.
- Adds an explicit 120-second HTTP timeout to allow the existing pipeline to finish.

3. Data safety
- No tables, columns, rows, publication records, or historical editions are changed.
- No destructive operations are used.

4. Security
- The existing public edge-function configuration remains unchanged.
- No credentials or secret values are added to the database.

5. Operational notes
- The job remains scheduled every 20 minutes.
- The function's own provider fallbacks and error handling remain responsible for reporting failures.
*/

CREATE OR REPLACE FUNCTION public.call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles?maxItems=10',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END;
$$;