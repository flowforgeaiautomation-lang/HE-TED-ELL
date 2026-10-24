/*
# Prevent comment deletion and ensure comments are permanent

## Purpose
The user wants comments to NEVER be erased - they should be visible to everyone
and permanently stored. Currently the comments table has a DELETE policy that
allows users to delete their own comments. This migration:

1. Removes the DELETE policy on comments so no one can delete comments
2. Removes the UPDATE policy on comments so comments cannot be modified
   (prevents erasing content by editing to empty)
3. Keeps INSERT and SELECT policies intact

## Changes
- Drops `comments_delete_own` policy (prevents deletion)
- Drops `comments_update_own` policy (prevents editing)
- Keeps `comments_select_visible` (everyone can read non-hidden comments)
- Keeps `comments_insert_own` (authenticated users can post)
*/

-- Drop the DELETE policy so comments can never be deleted
DROP POLICY IF EXISTS "comments_delete_own" ON comments;

-- Drop the UPDATE policy so comments can never be edited/erased
DROP POLICY IF EXISTS "comments_update_own" ON comments;
