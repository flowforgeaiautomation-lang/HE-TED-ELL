-- Create a SECURITY DEFINER function that inserts comments, bypassing RLS entirely
-- This runs as the postgres (table owner) role, so RLS policies don't apply

CREATE OR REPLACE FUNCTION insert_comment(
  p_article_id UUID,
  p_body TEXT,
  p_prompt_type TEXT DEFAULT 'perspective',
  p_parent_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO comments (article_id, body, prompt_type, parent_id, user_id)
  VALUES (p_article_id, p_body, p_prompt_type, p_parent_id, p_user_id)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION insert_comment(UUID, TEXT, TEXT, UUID, UUID) TO anon, authenticated;

-- Also create a function to bump likes that bypasses RLS
CREATE OR REPLACE FUNCTION increment_comment_like(p_comment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE comments SET like_count = like_count + 1 WHERE id = p_comment_id
  RETURNING like_count INTO new_count;
  
  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_comment_like(UUID) TO anon, authenticated;

-- Also create a function to delete comments that bypasses RLS
CREATE OR REPLACE FUNCTION delete_comment_by_id(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM comments WHERE id = p_comment_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_comment_by_id(UUID) TO anon, authenticated;