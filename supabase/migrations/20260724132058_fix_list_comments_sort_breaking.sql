/*
# Fix list_comments_by_article — broken make_interval call

The 'top' sort used make_interval(0,0,0,0,0,0,0,-c.like_count) which doesn't
exist (make_interval takes years, months, weeks, days, hours, mins, secs — 7 args,
all integers, secs being double precision). This caused the entire function to
crash with ERROR 42883, meaning NO comments could ever be loaded.

Fix: use a simple numeric sort expression instead of make_interval.
*/
DROP FUNCTION IF EXISTS list_comments_by_article(uuid, text);

CREATE OR REPLACE FUNCTION list_comments_by_article(
  p_article_id uuid,
  p_sort text DEFAULT 'newest'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
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
      'reply_count', c.reply_count,
      'is_edited', c.is_edited,
      'status', c.status,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) ORDER BY
      CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
      CASE
        WHEN p_sort = 'oldest' THEN c.created_at
        ELSE NULL
      END,
      CASE
        WHEN p_sort = 'top' THEN (-c.like_count)
        ELSE NULL
      END,
      c.created_at DESC
  ), '[]'::json) INTO result
  FROM comments c
  LEFT JOIN profiles p ON p.id = c.user_id
  WHERE c.article_id = p_article_id AND c.is_hidden = false;

  RETURN result;
END;
$$;
