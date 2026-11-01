-- Fix the cron function to call the edge function directly (no auth needed, verify_jwt=false)
CREATE OR REPLACE FUNCTION public.call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles?maxItems=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$;
