-- Repair existing articles: strip boilerplate, login prompts, ad code, HTML artifacts

-- 1. Strip HTML entities from titles and deks
UPDATE articles
SET title = REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(title, '&#[0-9]+;', '', 'g'),
        '&[a-zA-Z]+;', '', 'g'
      ),
      '&#\d{1,5}(?![;\d])', '', 'g'
    ),
    dek = REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(dek, '&#[0-9]+;', '', 'g'),
        '&[a-zA-Z]+;', '', 'g'
      ),
      '&#\d{1,5}(?![;\d])', '', 'g'
    )
WHERE title ~ '&#[0-9]+;|&[a-zA-Z]+;|&#\d{1,5}(?![;\d])'
   OR dek ~ '&#[0-9]+;|&[a-zA-Z]+;|&#\d{1,5}(?![;\d])';

-- 2. Strip ad code artifacts from story JSON
UPDATE articles
SET story = REGEXP_REPLACE(story::text, '\}\);', '', 'g')::jsonb
WHERE story::text ~ '\}\);';

-- 3. Strip boilerplate/login/subscription prompts from story JSON
UPDATE articles
SET story = REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    story::text,
                    'You can save this article by registering[^"]*', '', 'gi'
                  ),
                  'Or sign-in if you have an account[^"]*', '', 'gi'
                ),
                'Register for free[^"]*', '', 'gi'
              ),
              'Subscribe to (read|continue|unlock)[^"]*', '', 'gi'
            ),
            'Continue reading[^"]*', '', 'gi'
          ),
          'Cookie (notice|policy)[^"]*', '', 'gi'
        ),
        'We use cookies[^"]*', '', 'gi'
      ),
      '(Sponsored content|Sponsored by|Promo code)[^"]*', '', 'gi'
    )::jsonb
WHERE story::text ~* 'save this article|sign-in if you have|register for free|subscribe to|continue reading|cookie (notice|policy)|we use cookies|sponsored content|sponsored by|promo code';

-- 4. Ensure all articles have created_at
UPDATE articles
SET created_at = published_at
WHERE created_at IS NULL;

-- 5. Unpublish articles with empty title or no content
UPDATE articles
SET is_published = false
WHERE title IS NULL
   OR title = ''
   OR (story IS NULL AND dek IS NULL);

-- 6. Fix broken data: URL cover images
UPDATE articles
SET cover_image_url = NULL
WHERE cover_image_url LIKE 'data:image/%';
