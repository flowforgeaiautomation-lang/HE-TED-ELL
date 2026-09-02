-- Fix generate_clean_dek to be more aggressive about one-line truncation
CREATE OR REPLACE FUNCTION public.generate_clean_dek(source_text text, article_title text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  cleaned text;
  first_sentence text;
  trimmed text;
  max_len integer := 180;
BEGIN
  IF source_text IS NULL OR source_text = '' THEN
    RETURN article_title;
  END IF;

  cleaned := clean_article_text(source_text);
  
  -- Try to extract first sentence (up to max_len chars)
  first_sentence := substring(cleaned FROM '^[^.!?]{15,' || max_len || '}[.!?]');
  
  IF first_sentence IS NOT NULL AND length(first_sentence) <= max_len THEN
    trimmed := first_sentence;
  ELSE
    -- No sentence ending found within limit, take first max_len chars
    trimmed := substring(cleaned FROM 1 FOR max_len);
    -- Cut at last space to avoid breaking words
    trimmed := regexp_replace(trimmed, '\s+\S*$', '');
    -- Ensure it ends with a period
    trimmed := rtrim(trimmed) || '.';
  END IF;

  -- Ensure first letter is capitalized
  IF length(trimmed) > 0 THEN
    trimmed := upper(substring(trimmed FROM 1 FOR 1)) || substring(trimmed FROM 2);
  END IF;

  -- Ensure it ends with punctuation
  IF trimmed !~ '[.!?]$' THEN
    trimmed := rtrim(trimmed) || '.';
  END IF;

  RETURN trimmed;
END;
$function$;
