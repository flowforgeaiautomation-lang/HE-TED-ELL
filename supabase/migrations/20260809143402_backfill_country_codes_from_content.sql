-- Backfill country_code for existing articles based on story->'countries' and title analysis
-- The AI-generated story->'countries' field has country names we can map to ISO codes

-- First, create a mapping function from country name to ISO alpha-2 code
CREATE OR REPLACE FUNCTION country_name_to_code(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    -- Handle common country name formats
    WHEN name ILIKE '%norway%' OR name ILIKE '%norsk%' THEN 'NO'
    WHEN name ILIKE '%united states%' OR name ILIKE '%USA%' OR name ILIKE '%America%' OR name = 'US' THEN 'US'
    WHEN name ILIKE '%united kingdom%' OR name ILIKE '%Britain%' OR name ILIKE '%England%' OR name ILIKE '%UK%' THEN 'GB'
    WHEN name ILIKE '%india%' OR name = 'IN' THEN 'IN'
    WHEN name ILIKE '%china%' THEN 'CN'
    WHEN name ILIKE '%japan%' THEN 'JP'
    WHEN name ILIKE '%germany%' THEN 'DE'
    WHEN name ILIKE '%france%' THEN 'FR'
    WHEN name ILIKE '%canada%' THEN 'CA'
    WHEN name ILIKE '%australia%' THEN 'AU'
    WHEN name ILIKE '%russia%' OR name ILIKE '%russian%' THEN 'RU'
    WHEN name ILIKE '%ukraine%' OR name ILIKE '%ukrainian%' THEN 'UA'
    WHEN name ILIKE '%south korea%' OR name ILIKE '%korean%' THEN 'KR'
    WHEN name ILIKE '%north korea%' THEN 'KP'
    WHEN name ILIKE '%brazil%' THEN 'BR'
    WHEN name ILIKE '%south africa%' THEN 'ZA'
    WHEN name ILIKE '%uae%' OR name ILIKE '%united arab emirates%' THEN 'AE'
    WHEN name ILIKE '%singapore%' THEN 'SG'
    WHEN name ILIKE '%israel%' THEN 'IL'
    WHEN name ILIKE '%iran%' THEN 'IR'
    WHEN name ILIKE '%iraq%' THEN 'IQ'
    WHEN name ILIKE '%afghanistan%' THEN 'AF'
    WHEN name ILIKE '%pakistan%' THEN 'PK'
    WHEN name ILIKE '%bangladesh%' THEN 'BD'
    WHEN name ILIKE '%sri lanka%' THEN 'LK'
    WHEN name ILIKE '%nepal%' THEN 'NP'
    WHEN name ILIKE '%myanmar%' OR name ILIKE '%burma%' THEN 'MM'
    WHEN name ILIKE '%thailand%' THEN 'TH'
    WHEN name ILIKE '%vietnam%' THEN 'VN'
    WHEN name ILIKE '%indonesia%' THEN 'ID'
    WHEN name ILIKE '%malaysia%' THEN 'MY'
    WHEN name ILIKE '%philippines%' THEN 'PH'
    WHEN name ILIKE '%mexico%' THEN 'MX'
    WHEN name ILIKE '%argentina%' THEN 'AR'
    WHEN name ILIKE '%chile%' THEN 'CL'
    WHEN name ILIKE '%colombia%' THEN 'CO'
    WHEN name ILIKE '%peru%' THEN 'PE'
    WHEN name ILIKE '%venezuela%' THEN 'VE'
    WHEN name ILIKE '%spain%' THEN 'ES'
    WHEN name ILIKE '%italy%' THEN 'IT'
    WHEN name ILIKE '%portugal%' THEN 'PT'
    WHEN name ILIKE '%netherlands%' OR name ILIKE '%dutch%' THEN 'NL'
    WHEN name ILIKE '%belgium%' THEN 'BE'
    WHEN name ILIKE '%switzerland%' THEN 'CH'
    WHEN name ILIKE '%austria%' THEN 'AT'
    WHEN name ILIKE '%sweden%' THEN 'SE'
    WHEN name ILIKE '%denmark%' THEN 'DK'
    WHEN name ILIKE '%finland%' THEN 'FI'
    WHEN name ILIKE '%poland%' THEN 'PL'
    WHEN name ILIKE '%turkey%' OR name ILIKE '%türkiye%' THEN 'TR'
    WHEN name ILIKE '%greece%' THEN 'GR'
    WHEN name ILIKE '%egypt%' THEN 'EG'
    WHEN name ILIKE '%saudi arabia%' THEN 'SA'
    WHEN name ILIKE '%qatar%' THEN 'QA'
    WHEN name ILIKE '%nigeria%' THEN 'NG'
    WHEN name ILIKE '%kenya%' THEN 'KE'
    WHEN name ILIKE '%ethiopia%' THEN 'ET'
    WHEN name ILIKE '%sudan%' THEN 'SD'
    WHEN name ILIKE '%mali%' THEN 'ML'
    WHEN name ILIKE '%syria%' THEN 'SY'
    WHEN name ILIKE '%lebanon%' THEN 'LB'
    WHEN name ILIKE '%jordan%' THEN 'JO'
    WHEN name ILIKE '%yemen%' THEN 'YE'
    WHEN name ILIKE '%libya%' THEN 'LY'
    WHEN name ILIKE '%tunisia%' THEN 'TN'
    WHEN name ILIKE '%algeria%' THEN 'DZ'
    WHEN name ILIKE '%morocco%' THEN 'MA'
    WHEN name ILIKE '%iceland%' THEN 'IS'
    WHEN name ILIKE '%ireland%' THEN 'IE'
    WHEN name ILIKE '%new zealand%' THEN 'NZ'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill: extract the first country from story->'countries' and map to code
-- Skip articles where the country name is "India" if the title doesn't mention India
-- (the AI was incorrectly tagging everything as India)
UPDATE articles
SET country_code = sub.country_code
FROM (
  SELECT
    a.id,
    CASE
      -- If the first country name maps to a code, use it
      WHEN country_name_to_code(countries->0->>'name') IS NOT NULL
        AND NOT (
          -- Don't trust "India" tag if title doesn't mention India-related words
          (a.story->'countries'->0->>'name') ILIKE '%india%'
          AND a.title !~* '(india|modi|delhi|mumbai|bengaluru|hindu|sanskrit|rupee|ipl|cricket|ganges|ganga|kashmir|punjab|tamil|bollywood|isro|air india|tata|ambani|adani|reliance|infosys|wipro|sbi|lIC|rbi|gst|parliament|lok sabha|rajya|congress|bjp|supreme court)'
        )
      THEN country_name_to_code(countries->0->>'name')
      -- Try second country if first is "India" but title doesn't match India
      WHEN (a.story->'countries'->0->>'name') ILIKE '%india%'
        AND a.title !~* '(india|modi|delhi|mumbai|bengaluru|hindu|sanskrit|rupee|ipl|cricket|ganges|ganga|kashmir|punjab|tamil|bollywood|isro|air india|tata|ambani|adani|reliance|infosys|wipro|sbi|lic|rbi|gst|parliament|lok sabha|rajya|congress|bjp|supreme court)'
        AND country_name_to_code(a.story->'countries'->1->>'name') IS NOT NULL
      THEN country_name_to_code(a.story->'countries'->1->>'name')
      -- Title-based detection for major countries
      WHEN a.title ~* '(south korea|korean|seoul|samsung|hyundai|LG|kia)' THEN 'KR'
      WHEN a.title ~* '(north korea|pyongyang|kim jong)' THEN 'KP'
      WHEN a.title ~* '(putin|russia|kremlin|moscow|russian)' THEN 'RU'
      WHEN a.title ~* '(ukraine|kyiv|kiev|zelen)' THEN 'UA'
      WHEN a.title ~* '(china|chinese|beijing|xi jinping|shanghai|huawei|tencent|alibaba|byd|xiaomi)' THEN 'CN'
      WHEN a.title ~* '(japan|japanese|tokyo|toyota|sony|nintendo|honda|nissan|panasonic|softbank)' THEN 'JP'
      WHEN a.title ~* '(germany|german|berlin|merkel|olaf|bundes|volkswagen|bmw|siemens)' THEN 'DE'
      WHEN a.title ~* '(france|french|paris|macron|renault|peugeot|airbus|totalEnergies)' THEN 'FR'
      WHEN a.title ~* '(united kingdom|british|london|england|UK |brexit|Rishi |Starmer)' THEN 'GB'
      WHEN a.title ~* '(united states|american|washington|biden|trump|congress|senate|white house|pentagon|CDC|FDA|FCC|FTC|SEC|NASA|NOAA|US )' THEN 'US'
      WHEN a.title ~* '(canada|canadian|toronto|ottawa|trudeau)' THEN 'CA'
      WHEN a.title ~* '(australia|australian|sydney|melbourne|canberra)' THEN 'AU'
      WHEN a.title ~* '(brazil|brazilian|brasilia|lula|amazon|sao paulo)' THEN 'BR'
      WHEN a.title ~* '(south africa|johannesburg|cape town|pretoria)' THEN 'ZA'
      WHEN a.title ~* '(israel|israeli|tel aviv|jerusalem|netanyahu|hamas|gaza)' THEN 'IL'
      WHEN a.title ~* '(iran|iranian|tehran|ayatollah)' THEN 'IR'
      WHEN a.title ~* '(saudi|riyadh|mohammed bin salman|MBS)' THEN 'SA'
      WHEN a.title ~* '(nigeria|nigerian|lagos|abuja)' THEN 'NG'
      WHEN a.title ~* '(mexico|mexican|mexico city|amlo|sheinbaum)' THEN 'MX'
      WHEN a.title ~* '(argentina|argentine|buenos aires|milei)' THEN 'AR'
      WHEN a.title ~* '(turkey|turkish|erdogan|istanbul|ankara)' THEN 'TR'
      WHEN a.title ~* '(india|indian|modi|delhi|mumbai|bengaluru|hindu|sanskrit|rupee|ipl|cricket|kashmir|bollywood|isro|tata|ambani|adani|reliance|infosys|wipro)' THEN 'IN'
      WHEN a.title ~* '(norway|norwegian|oslo|norge)' THEN 'NO'
      WHEN a.title ~* '(sweden|swedish|stockholm)' THEN 'SE'
      WHEN a.title ~* '(denmark|danish|copenhagen)' THEN 'DK'
      WHEN a.title ~* '(finland|finnish|helsinki)' THEN 'FI'
      WHEN a.title ~* '(netherlands|dutch|amsterdam|hague)' THEN 'NL'
      WHEN a.title ~* '(spain|spanish|madrid|barcelona|catalon)' THEN 'ES'
      WHEN a.title ~* '(italy|italian|rome|milan|naples)' THEN 'IT'
      WHEN a.title ~* '(poland|polish|warsaw)' THEN 'PL'
      WHEN a.title ~* '(greece|greek|athens)' THEN 'GR'
      WHEN a.title ~* '(egypt|egyptian|cairo)' THEN 'EG'
      WHEN a.title ~* '(pakistan|pakistani|islamabad|karachi|lahore)' THEN 'PK'
      WHEN a.title ~* '(afghanistan|afghan|kabul|taliban)' THEN 'AF'
      WHEN a.title ~* '(singapore|singaporean)' THEN 'SG'
      WHEN a.title ~* '(indonesia|indonesian|jakarta)' THEN 'ID'
      WHEN a.title ~* '(thailand|thai|bangkok)' THEN 'TH'
      WHEN a.title ~* '(vietnam|vietnamese|hanoi)' THEN 'VN'
      WHEN a.title ~* '(philippines|filipino|manila)' THEN 'PH'
      WHEN a.title ~* '(malaysia|malaysian|kuala lumpur)' THEN 'MY'
      WHEN a.title ~* '(iceland|icelandic|reykjavik)' THEN 'IS'
      WHEN a.title ~* '(ireland|irish|dublin)' THEN 'IE'
      WHEN a.title ~* '(new zealand|kiwi|wellington|auckland)' THEN 'NZ'
      WHEN a.title ~* '(colombia|colombian|bogota)' THEN 'CO'
      WHEN a.title ~* '(chile|chilean|santiago)' THEN 'CL'
      WHEN a.title ~* '(peru|peruvian|lima)' THEN 'PE'
      WHEN a.title ~* '(venezuela|venezuelan|caracas|maduro)' THEN 'VE'
      WHEN a.title ~* '(switzerland|swiss|bern|zurich|geneva)' THEN 'CH'
      WHEN a.title ~* '(belgium|belgian|brussels)' THEN 'BE'
      WHEN a.title ~* '(austria|austrian|vienna)' THEN 'AT'
      WHEN a.title ~* '(portugal|portuguese|lisbon)' THEN 'PT'
      WHEN a.title ~* '(qatar|qatari|doha)' THEN 'QA'
      WHEN a.title ~* '(uae|emirates|dubai|abu dhabi)' THEN 'AE'
      WHEN a.title ~* '(kenya|kenyan|nairobi)' THEN 'KE'
      WHEN a.title ~* '(ethiopia|ethiopian|addis ababa)' THEN 'ET'
      WHEN a.title ~* '(sudan|sudanese|khartoum)' THEN 'SD'
      WHEN a.title ~* '(syria|syrian|damascus|assad)' THEN 'SY'
      WHEN a.title ~* '(lebanon|lebanese|beirut)' THEN 'LB'
      WHEN a.title ~* '(jordan|jordanian|amman)' THEN 'JO'
      WHEN a.title ~* '(libya|libyan|tripoli)' THEN 'LY'
      WHEN a.title ~* '(tunisia|tunisian|tunis)' THEN 'TN'
      WHEN a.title ~* '(algeria|algerian|algiers)' THEN 'DZ'
      WHEN a.title ~* '(morocco|moroccan|rabat|casablanca)' THEN 'MA'
      WHEN a.title ~* '(mali|malian|bamako)' THEN 'ML'
      WHEN a.title ~* '(sri lanka|sinhalese|colombo)' THEN 'LK'
      WHEN a.title ~* '(nepal|nepalese|kathmandu)' THEN 'NP'
      WHEN a.title ~* '(myanmar|burmese|naypyidaw|yangon)' THEN 'MM'
      ELSE NULL
    END AS country_code
  FROM articles a
  CROSS JOIN LATERAL (
    SELECT (a.story->'countries') as countries
  ) as c
  WHERE a.is_published = true
    AND a.country_code IS NULL
) sub
WHERE articles.id = sub.id
  AND sub.country_code IS NOT NULL;
