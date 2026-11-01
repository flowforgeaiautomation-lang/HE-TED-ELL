-- Allow anonymous reflections: user_id can be null for reflections posted by non-signed-in users
ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;

-- Allow anon (not signed in) users to insert reflections
CREATE POLICY "comments_insert_anon_reflection"
  ON comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
