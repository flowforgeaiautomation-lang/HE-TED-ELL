-- Reset reprocessed_at for all articles so they get regenerated
-- through the updated AI prompt that generates the new format fields
-- (what_happened, how_it_happened, who_and_where, what_came_before, etc.)
UPDATE articles SET reprocessed_at = NULL;