-- Update the reprocess cron to use force=true for the next period,
-- so existing articles with reprocessed_at already set get regenerated.
-- After all articles are reprocessed, we'll revert to normal mode.
CREATE OR REPLACE FUNCTION public.call_reprocess_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
PERFORM net.http_post(
  url := 'https://theunitedhell.com/api/public/hooks/reprocess?limit=50&force=true',
  headers := jsonb_build_object(
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);
END;
$function$;
