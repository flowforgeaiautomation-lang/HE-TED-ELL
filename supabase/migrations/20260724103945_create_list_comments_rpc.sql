-- Create a SECURITY DEFINER function to list comments, bypassing RLS on both comments and profiles tables
CREATE OR REPLACE FUNCTION list_comments_by_article(p_article_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', c.id,
      'article_id', c.article_id,
      'user_id', c.user_id,
      'parent_id', c.parent_id,
      'prompt_type', c.prompt_type,
      'body', c.body,
      'like_count', c.like_count,
      'created_at', c.created_at,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) ORDER BY c.created_at ASC
  ), '[]'::json) INTO result
  FROM comments c
  LEFT JOIN profiles p ON p.id = c.user_id
  WHERE c.article_id = p_article_id AND c.is_hidden = false;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION list_comments_by_article(UUID) TO anon, authenticated;