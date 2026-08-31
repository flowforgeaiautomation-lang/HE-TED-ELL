/*
# Fix truncated deks - improved version
# Handles text where sentences are concatenated without spaces (e.g., "techA marine")
*/

CREATE OR REPLACE FUNCTION truncate_at_sentence(input_text TEXT, max_chars INT DEFAULT 280)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
  sentences TEXT[];
  result TEXT := '';
  sentence TEXT;
  -- Pattern for splitting: after . ! ? followed by space+Capital OR when a lowercase letter is followed by uppercase
  -- This handles both "sentence. Next" and "sentence.Next" (no space) patterns
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Clean whitespace
  cleaned := regexp_replace(input_text, '\s+', ' ', 'g');
  cleaned := trim(cleaned);
  
  -- Fix missing spaces between sentences: "techA" -> "tech. A"
  -- Pattern: lowercase letter + period + Capital letter (no space)
  cleaned := regexp_replace(cleaned, '([a-z])\.([A-Z])', '\1. \2', 'g');
  -- Pattern: lowercase letter + Capital letter (no period, no space) - likely missing ". "
  -- Only do this for clear sentence boundaries (e.g., "techA marine" -> "tech. A marine")
  -- But be careful not to break legitimate camelCase or names
  -- Only apply when the lowercase word before is >= 4 chars (likely a complete word)
  cleaned := regexp_replace(cleaned, '([a-z]{4,})([A-Z][a-z]{2,})', '\1. \2', 'g');
  
  IF length(cleaned) <= max_chars THEN
    RETURN cleaned;
  END IF;
  
  -- Split into sentences
  sentences := regexp_split_to_array(cleaned, '(?<=[.!?])\s+(?=[A-Z0-9"''(])');
  
  -- Build result from complete sentences
  FOREACH sentence IN ARRAY sentences LOOP
    sentence := trim(sentence);
    IF sentence = '' THEN CONTINUE; END IF;
    
    IF result = '' THEN
      result := sentence;
    ELSIF length(result) + 1 + length(sentence) <= max_chars THEN
      result := result || ' ' || sentence;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  IF result = '' THEN
    result := left(cleaned, max_chars);
  END IF;
  
  RETURN trim(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
