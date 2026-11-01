/*
# Replace ALL external cover image URLs with Pexels stock photos

235 articles have cover images from external news sites:
- i.guim.co.uk (Guardian) - 94 images
- static01.nyt.com (NYT) - 53 images
- img.etimg.com (Economic Times) - 20 images
- th-i.thgim.com (The Hindu) - 14 images
- www.hindustantimes.com - 10 images
- www.popsci.com - 10 images
- cdn.mos.cms.futurecdn.net - 10 images
- cdn.arstechnica.net - 9 images
- kotaku.com - 8 images
- images.ctfassets.net - 7 images

These images may contain embedded photo credits from the original source.
Replace ALL of them with Pexels stock photos matching the article category.
*/

-- Technology articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'technology' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Science articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'science' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- World articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'world' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Markets/business articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'markets' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- India articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/15261977/pexels-photo-15261977.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'india' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Movies articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/7231905/pexels-photo-7231905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'movies' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Music articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'music' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Climate/environment articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'climate' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Football articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/47730/pexels-photo-47730.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'football' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Books articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'books' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Health articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'health' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Space articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/220201/pexels-photo-220201.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'space' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Gaming articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'gaming' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- AI articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'artificial-intelligence' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Cricket articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'cricket' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Sport articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-ball-46798.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'sport' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Politics articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'politics' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Environment articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'environment' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Business articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'business' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Entertainment articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/7231905/pexels-photo-7231905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'entertainment' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Culture articles
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE category = 'culture' AND cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';

-- Catch any remaining non-pexels images
UPDATE articles SET cover_image_url = 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
WHERE cover_image_url NOT ILIKE '%pexels.com%' AND cover_image_url IS NOT NULL AND cover_image_url != '';