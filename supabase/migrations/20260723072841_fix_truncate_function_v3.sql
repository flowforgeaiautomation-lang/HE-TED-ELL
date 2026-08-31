/*
# Fix truncate function v3 - better sentence boundary detection
*/

CREATE OR REPLACE FUNCTION truncate_at_sentence(input_text TEXT, max_chars INT DEFAULT 280)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
  sentences TEXT[];
  result TEXT := '';
  sentence TEXT;
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Clean whitespace
  cleaned := regexp_replace(input_text, '\s+', ' ', 'g');
  cleaned := trim(cleaned);
  
  -- Fix missing spaces between sentences: "techA" -> "tech. A"
  -- Pattern 1: lowercase + period + Capital (no space) -> add space
  cleaned := regexp_replace(cleaned, '([a-z])\.([A-Z])', '\1. \2', 'g');
  -- Pattern 2: lowercase word (4+ chars) + Capital letter (no space, no period) -> add ". "
  -- This handles "techA marine" -> "tech. A marine"
  cleaned := regexp_replace(cleaned, '([a-z]{4,})([A-Z])', '\1. \2', 'g');
  
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
