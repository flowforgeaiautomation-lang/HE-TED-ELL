-- Remove the broken cron job and function since the database can't reach external hosts
SELECT cron.unschedule('fetch-news-articles-every-20min');
DROP FUNCTION IF EXISTS call_fetch_news_articles();