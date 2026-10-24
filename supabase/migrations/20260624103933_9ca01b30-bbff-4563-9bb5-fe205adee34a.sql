
-- Lock down search_path on existing functions
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.bump_article_likes() SET search_path = public;
ALTER FUNCTION public.bump_article_bookmarks() SET search_path = public;
ALTER FUNCTION public.bump_article_comments() SET search_path = public;
ALTER FUNCTION public.bump_comment_likes() SET search_path = public;

-- These are trigger-only; nobody should call them as RPC
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_article_likes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_article_bookmarks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_article_comments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_comment_likes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_article_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_article_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Replace overly broad articles_insert_auth WITH CHECK(true) with self-attribution check
DROP POLICY IF EXISTS "articles_insert_auth" ON public.articles;
CREATE POLICY "articles_insert_self" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid());
