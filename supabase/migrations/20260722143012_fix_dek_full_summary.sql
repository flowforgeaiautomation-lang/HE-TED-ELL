-- Fix generate_clean_dek to use the FULL summary, not truncated
-- The user wants the whole summary as the subheadline
CREATE OR REPLACE FUNCTION public.generate_clean_dek(source_text text, article_title text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  cleaned text;
  trimmed text;
BEGIN
  IF source_text IS NULL OR source_text = '' THEN
    RETURN article_title;
  END IF;

  cleaned := clean_article_text(source_text);
  
  -- Strip HTML tags
  cleaned := regexp_replace(cleaned, '<[^>]+>', '');
  
  -- Remove common news site boilerplate phrases
  cleaned := regexp_replace(cleaned, 'Get our breaking news email.*$', '', 'i');
  cleaned := regexp_replace(cleaned, 'Follow our Australia news.*$', '', 'i');
  cleaned := regexp_replace(cleaned, 'World Cup live.*$', '', 'i');
  cleaned := regexp_replace(cleaned, 'Sign up for.*$', '', 'i');
  cleaned := regexp_replace(cleaned, 'Subscribe.*$', '', 'i');
  cleaned := regexp_replace(cleaned, 'Read more.*$', '', 'i');
  
  -- Remove URLs
  cleaned := regexp_replace(cleaned, 'https?://\S+', '');
  
  -- Collapse whitespace
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  cleaned := btrim(cleaned);
  
  trimmed := cleaned;

  -- Ensure it ends with punctuation
  IF trimmed !~ '[.!?]$' AND length(trimmed) > 0 THEN
    trimmed := rtrim(trimmed) || '.';
  END IF;

  -- Ensure first letter is capitalized
  IF length(trimmed) > 0 THEN
    trimmed := upper(substring(trimmed FROM 1 FOR 1)) || substring(trimmed FROM 2);
  END IF;

  RETURN trimmed;
END;
$function$;
