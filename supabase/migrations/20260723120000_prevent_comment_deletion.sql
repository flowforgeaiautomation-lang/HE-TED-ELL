/*
# Prevent comment deletion and ensure comments are permanent

## Purpose
Comments should never be erased - they must be visible to everyone and permanently stored.
This migration removes the DELETE and UPDATE policies on the comments table so that
no user can delete or edit their comments after posting.

## Changes
1. Drops `comments_delete_own` policy (prevents users from deleting their comments)
2. Drops `comments_update_own` policy (prevents users from editing/erasing comment content)
3. Keeps `comments_select_visible` (everyone can read non-hidden comments)
4. Keeps `comments_insert_own` (authenticated users can still post new comments)

## Security
- SELECT: Still visible to everyone (anon + authenticated) via `comments_select_visible`
- INSERT: Still available to authenticated users via `comments_insert_own`
- UPDATE: No policy = no one can update comments (permanent content)
- DELETE: No policy = no one can delete comments (permanent content)
*/

-- Drop the DELETE policy so comments can never be deleted
DROP POLICY IF EXISTS "comments_delete_own" ON comments;

-- Drop the UPDATE policy so comments can never be edited/erased
DROP POLICY IF EXISTS "comments_update_own" ON comments;
