
-- First, let's check what RLS policies exist on articles
SELECT polname, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'articles'::regclass;
