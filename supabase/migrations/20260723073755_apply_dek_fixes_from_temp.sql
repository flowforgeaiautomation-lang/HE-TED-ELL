
-- Use the temp table to update articles
UPDATE articles a
SET dek = t.new_dek
FROM temp_fixed_deks t
WHERE a.id = t.article_id
  AND t.new_dek IS NOT NULL
  AND t.new_dek != t.old_dek;

-- Drop the temp table
DROP TABLE IF EXISTS temp_fixed_deks;
