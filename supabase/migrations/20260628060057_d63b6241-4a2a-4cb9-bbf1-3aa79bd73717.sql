DROP TRIGGER IF EXISTS ensure_article_story_quality_trigger ON public.articles;
DROP FUNCTION IF EXISTS public.ensure_article_story_quality();

-- Temporarily drop the append-only delete guard, purge legacy articles, then restore it.
DROP TRIGGER IF EXISTS prevent_article_delete_trigger ON public.articles;

DELETE FROM public.articles
WHERE (story ? 'qa' OR story ? 'what' OR story ? 'why' OR story ? 'why_should_i_care')
  AND NOT (story ? 'main_story');

CREATE TRIGGER prevent_article_delete_trigger
BEFORE DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.prevent_article_delete();