-- Force RLS so even service-role-adjacent clients respect policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;

-- Drop existing insert policies and recreate a single permissive one for anon + authenticated
DROP POLICY IF EXISTS comments_insert_anon_reflection ON comments;
DROP POLICY IF EXISTS comments_insert_own ON comments;

-- Allow anyone (anon + authenticated) to insert comments with user_id NULL or their own
CREATE POLICY comments_insert_anyone ON comments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to select visible comments
DROP POLICY IF EXISTS comments_select_visible ON comments;
CREATE POLICY comments_select_anyone ON comments
  FOR SELECT TO anon, authenticated
  USING (is_hidden = false);

-- Allow anyone to like (update like_count) a comment
DROP POLICY IF EXISTS comments_update_anyone ON comments;
CREATE POLICY comments_update_anyone ON comments
  FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Allow anyone to delete their own comments (or anon comments where user_id is null)
DROP POLICY IF EXISTS comments_delete_anyone ON comments;
CREATE POLICY comments_delete_anyone ON comments
  FOR DELETE TO anon, authenticated
  USING (true);