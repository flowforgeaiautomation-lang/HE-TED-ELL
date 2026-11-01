-- Re-normalize all existing articles with upgraded trigger
UPDATE articles
SET story = story
  - 'key_numbers' - 'people' - 'organizations' - 'countries'
  - 'historical_context' - 'future_outlook' - 'timeline'
  - 'vocabulary' - 'what_happens_next',
    updated_at = now()
WHERE TRUE;