/*
# Add is_admin column to profiles

Adds a boolean `is_admin` column to the profiles table, defaulting to false.
This is used by the admin panel server functions to check access.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Grant admin to specific email if needed (update manually)
-- UPDATE profiles SET is_admin = true WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@theunitedhell.in');