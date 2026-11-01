-- Fix the call_fetch_news_articles function to point to the correct Supabase project
-- The old URL pointed to a dead project (0ec90b57d6e95fcbda19832f) with an expired JWT.
CREATE OR REPLACE FUNCTION public.call_fetch_news_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
END;
$function$;
