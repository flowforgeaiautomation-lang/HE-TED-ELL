-- Reset all articles so they get reprocessed through the new originality pipeline
UPDATE articles SET reprocessed_at = NULL;
