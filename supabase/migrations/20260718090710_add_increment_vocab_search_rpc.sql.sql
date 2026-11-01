/*
# Add increment_vocab_search RPC (single-tenant, no auth)

1. Purpose
   - Atomic counter increment for vocabulary_cache.search_count and
     last_searched_at, used by the Universal Vocabulary Search feature to
     track popular words without race conditions.
   - SECURITY DEFINER so the anon role can invoke it (the table's RLS already
     permits anon writes, but an upsert via RPC avoids double-row issues).

2. New Function: increment_vocab_search(w text)
   - Upserts the word row: search_count = COALESCE(search_count, 0) + 1,
     last_searched_at = now().
   - Returns void.

3. Security
   - FUNCTION marked SECURITY DEFINER, EXECUTE ON anon (PUBLIC granted).
   - No new tables; no policy changes.
*/

CREATE OR REPLACE FUNCTION public.increment_vocab_search(w text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.vocabulary_cache (word, search_count, last_searched_at, updated_at)
  VALUES (lower(trim(w)), 1, now(), now())
  ON CONFLICT (word) DO UPDATE
  SET search_count = vocabulary_cache.search_count + 1,
      last_searched_at = now(),
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_vocab_search(text) TO anon, authenticated;
