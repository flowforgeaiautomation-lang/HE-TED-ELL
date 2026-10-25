-- Replace the cron function to call the Supabase Edge Function directly
-- instead of the broken app endpoint at theunitedhell.in
CREATE OR REPLACE FUNCTION public.call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles?maxItems=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Set the anon key setting for the function
ALTER FUNCTION public.call_fetch_news_articles() SET search_path = public;
