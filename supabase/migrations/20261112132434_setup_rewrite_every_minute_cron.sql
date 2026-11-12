-- Rewrite existing published articles in place, every minute, until none remain.
CREATE OR REPLACE FUNCTION public.call_rewrite_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
BEGIN
  PERFORM net.http_get(
    url := 'https://myrteqlcfwckgdokzzhg.supabase.co/functions/v1/fetch-news-articles?rewrite=1&limit=3',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 115000
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.call_rewrite_articles() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'rewrite-articles-every-minute',
  '* * * * *',
  $$SELECT public.call_rewrite_articles();$$
);