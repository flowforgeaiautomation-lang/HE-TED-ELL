-- Repair articles with JavaScript code artifacts (pmcCnx, connatix, window.pmc, etc.)

UPDATE articles
SET story = regexp_replace(story::text, 'pmcCnx\.cmd\.push\(function\s*\{[^}]*\}\)', '', 'gi')::jsonb
WHERE story::text ~* 'pmcCnx';

UPDATE articles
SET story = regexp_replace(story::text, 'pmcCnx\(\{[^}]*\}\)\.render\([^)]*\)', '', 'gi')::jsonb
WHERE story::text ~* 'pmcCnx';

UPDATE articles
SET story = regexp_replace(story::text, 'window\.pmc\.harmony[^;]*;?', '', 'gi')::jsonb
WHERE story::text ~* 'window\.pmc\.harmony';

UPDATE articles
SET story = regexp_replace(story::text, 'if\s*\(\s*!?\s*window\.pmc[^;]*;?', '', 'gi')::jsonb
WHERE story::text ~* 'window\.pmc';

UPDATE articles
SET story = regexp_replace(story::text, 'pmcAtlasMG\s*:\s*\{[^}]*\}', '', 'gi')::jsonb
WHERE story::text ~* 'pmcAtlasMG';

UPDATE articles
SET story = regexp_replace(story::text, 'playlistId\s*:\s*''[^'']*''', '', 'gi')::jsonb
WHERE story::text ~* 'playlistId';

UPDATE articles
SET story = regexp_replace(story::text, 'playerId\s*:\s*''[^'']*''', '', 'gi')::jsonb
WHERE story::text ~* 'playerId';

UPDATE articles
SET story = regexp_replace(story::text, 'connatix_contextual_player_div', '', 'gi')::jsonb
WHERE story::text ~* 'connatix';

UPDATE articles
SET story = regexp_replace(story::text, 'isEventAdScheduledTime', '', 'gi')::jsonb
WHERE story::text ~* 'isEventAdScheduledTime';

UPDATE articles
SET story = regexp_replace(story::text, 'switchToHarmonyPlayer', '', 'gi')::jsonb
WHERE story::text ~* 'switchToHarmonyPlayer';

UPDATE articles
SET dek = regexp_replace(dek, 'pmcCnx|connatix|pmcAtlasMG|isEventAdScheduledTime|playlistId|playerId|switchToHarmonyPlayer', '', 'gi')
WHERE dek ~* 'pmcCnx|connatix|pmcAtlasMG|isEventAdScheduledTime|playlistId|playerId|switchToHarmonyPlayer';

UPDATE articles
SET title = regexp_replace(title, 'pmcCnx|connatix|pmcAtlasMG|isEventAdScheduledTime|playlistId|playerId|switchToHarmonyPlayer', '', 'gi')
WHERE title ~* 'pmcCnx|connatix|pmcAtlasMG|isEventAdScheduledTime|playlistId|playerId|switchToHarmonyPlayer';
