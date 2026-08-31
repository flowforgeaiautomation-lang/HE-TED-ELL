/*
# Fix vocabulary: replace generic "development" with actual difficult words
*/

-- Function to check if a word is common/easy
CREATE OR REPLACE FUNCTION is_common_word(word text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  common_words text[] := ARRAY[
    'the','a','an','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','can','shall',
    'of','in','on','at','to','for','with','by','from','about','into','through',
    'during','before','after','above','below','up','down','out','off','over','under',
    'again','further','then','once','here','there','when','where','why','how',
    'all','any','both','each','few','more','most','other','some','such','no','nor',
    'not','only','own','same','so','than','too','very','just','also','but','and',
    'or','if','because','as','until','while','this','that','these','those',
    'i','me','my','myself','we','our','ours','ourselves','you','your','yours',
    'he','him','his','she','her','hers','it','its','they','them','their','theirs',
    'what','which','who','whom','whose','one','two','three','four','five','six',
    'seven','eight','nine','ten','first','second','third','last','new','old',
    'good','bad','big','small','high','low','long','short','great','little',
    'own','same','other','such','many','much','more','most','less','least',
    'suspended','teaching','teacher','reported','reporting','reports','report',
    'according','statement','announced','said','says','told','tells','telling',
    'development','developments','developing','developed','develop',
    'government','governments','minister','ministry','department','official',
    'public','people','person','group','groups','community','communities',
    'country','countries','nation','nations','national','international',
    'world','today','yesterday','tomorrow','week','month','year','years','day',
    'time','times','part','parts','place','places','way','ways','case','cases',
    'work','works','working','worker','workers','job','jobs','business',
    'company','companies','market','markets','school','schools','student',
    'students','city','cities','area','areas','region','regions','local',
    'general','generally','specific','specifically','important','importance',
    'include','including','included','includes','involving','involved','involves',
    'related','relating','relation','relations','associate','associated',
    'following','followed','follows','follow','based','bases','base',
    'called','calls','calling','used','uses','using','use','made','make','makes',
    'making','give','gives','given','giving','take','takes','taken','taking',
    'get','gets','got','getting','go','goes','went','going','come','comes','came',
    'coming','see','sees','saw','seeing','look','looks','looked','looking',
    'find','finds','found','finding','think','thinks','thought','thinking',
    'know','knows','knew','knowing','want','wants','wanted','wanting',
    'need','needs','needed','needing','try','tries','tried','trying',
    'help','helps','helped','helping','like','likes','liked','liking',
    'every','much','many','some','any','all','no','not','nor','so','too','very',
    'still','already','always','never','often','sometimes','usually','generally',
    'however','therefore','moreover','furthermore','meanwhile','instead',
    'despite','although','though','unless','whether','either','neither',
    'against','between','within','without','along','among','across','behind',
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
    'January','February','March','April','May','June','July','August',
    'September','October','November','December',
    'something','anything','nothing','everything','someone','anyone',
    'however','moreover','addition','additional','actually','able','ability',
    'available','availability','aware','awareness','because','before','being',
    'believe','believed','best','better','between','beyond','brief','briefly',
    'cause','caused','causes','causing','certain','certainly','change',
    'changed','changes','changing','chief','clear','clearly','close',
    'common','commonly','concern','concerned','concerns','condition',
    'conditions','consider','considered','considering','continue','continued',
    'continues','continuing','course','create','created','creates','creating',
    'current','currently','data','date','deal','deals','decision','decisions',
    'describe','described','deserves','designed','despite','detail','detailed',
    'details','different','differently','directly','does','done','doubt',
    'early','easily','easy','effect','effects','effort','efforts','either',
    'else','end','ended','ends','enjoy','enough','enter','entire','entirely',
    'especially','even','event','events','ever','every','everyone',
    'everything','evidence','example','examples','exist','exists','expect',
    'expected','expects','experience','experienced','experiences','fact',
    'facts','fair','fairly','far','feel','feels','felt','few','field',
    'fields','figure','figures','final','finally','fine','firm','firms',
    'former','forward','found','four','full','fully','fund','funds',
    'general','generally','given','gives','going','gone','good','got',
    'great','greater','greatest','group','groups','grow','grown','growth',
    'happen','happened','happens','happening','hard','hardly','having',
    'head','health','held','help','helped','her','here','high','higher',
    'highest','him','his','home','hope','hoped','hopes','however','hundred',
    'idea','ideas','identified','identify','immediate','immediately',
    'impact','impacted','impacts','important','importance','improve',
    'improved','improvement','improvements','include','included','includes',
    'including','increase','increased','increases','indeed','industry',
    'information','inside','instead','interest','interested','interesting',
    'interests','involved','involves','involving','issue','issues','it',
    'its','itself','job','jobs','join','joined','joining','keep','keeping',
    'kept','key','knew','know','known','knows','large','larger','largest',
    'last','late','later','latest','lead','leader','leaders','leading',
    'learn','learned','learning','least','leave','left','less','let','level',
    'levels','life','like','likely','limited','line','lines','list','little',
    'live','lived','lives','living','local','locally','long','longer','look',
    'looked','looking','looks','low','lower','made','main','mainly','make',
    'makes','making','man','many','manner','matters','may','maybe','mean',
    'means','meant','measure','measures','meet','member','members','men',
    'method','methods','might','million','millions','mind','mine','minor',
    'minutes','miss','model','models','modern','moment','money','month',
    'months','more','morning','most','mostly','much','must','my','name',
    'named','names','national','naturally','near','nearly','necessary',
    'need','needed','needs','never','new','newly','next','night','nine',
    'none','normal','normally','not','note','noted','notes','nothing',
    'notice','noticed','now','number','numbers','obvious','obviously',
    'occasion','occur','occurred','occurs','off','offer','offered',
    'offering','offers','office','officer','officers','offices','official',
    'officials','often','okay','old','once','one','ones','only','open',
    'opened','opening','opens','operation','operations','opportunity',
    'option','options','order','ordered','orders','organization',
    'organizations','other','others','ought','our','ours','out','over',
    'own','page','pages','paid','part','particular','particularly','parts',
    'party','passed','past','patient','patients','pay','paying','people',
    'per','percent','perhaps','period','periods','person','personal',
    'persons','pick','picked','place','placed','places','plan','planned',
    'planning','plans','play','played','player','players','plays',
    'please','point','pointed','points','policy','policies','poor',
    'popular','position','possible','possibly','post','potential',
    'potentially','practice','practices','present','presented','press',
    'pressure','pretty','previous','previously','price','prices','primary',
    'principal','principle','principles','probably','problem','problems',
    'process','processes','produce','produced','produces','product',
    'production','products','professional','program','programs','project',
    'projects','proper','properly','property','propose','proposed',
    'provides','public','published','purchase','purpose','put','quality',
    'question','questions','quite','rather','rate','rates','rather','read',
    'reader','reading','ready','real','really','reason','reasons','recent',
    'recently','record','recorded','red','reduce','reduced','refer',
    'referred','regarding','regardless','region','regional','regions',
    'related','relations','relationship','remain','remained','remains',
    'remember','remove','removed','report','reported','reporter','reports',
    'require','required','requires','research','researchers','resources',
    'respond','response','responses','result','resulted','results','return',
    'returned','returns','reveal','revealed','review','reviewed','right',
    'rise','rose','rising','round','rule','rules','run','running','said',
    'same','save','saved','saw','say','saying','says','school','schools',
    'score','screen','search','season','seat','second','secretary',
    'section','sections','see','seem','seemed','seems','seen','self','sell',
    'sells','selling','senior','sense','sent','series','serious','seriously',
    'serve','served','service','services','serves','set','setting',
    'several','shall','short','shot','show','showed','shown','shows','side',
    'sides','sign','signed','simple','simply','since','single','sit',
    'sitting','situation','six','size','small','smaller','smaller','so',
    'social','society','some','somebody','someone','something',
    'sometimes','somewhat','soon','sort','source','sources','special',
    'specific','specifically','spend','spent','staff','stage','stages',
    'stand','standard','start','started','starting','starts','state',
    'states','statement','statements','stayed','step','steps','still',
    'stop','stopped','story','street','streets','strong','strongly',
    'student','students','study','studied','studying','subject','success',
    'successful','successfully','such','sudden','suddenly','suffer',
    'suggest','suggested','suggests','summer','support','supported',
    'supports','sure','system','systems','table','take','taken','takes',
    'taking','talk','talked','talking','task','taught','tax','teach',
    'teacher','teachers','teaching','team','teams','tell','telling','tells',
    'term','terms','test','tested','testing','than','thank','thanks',
    'that','the','their','them','then','theory','there','therefore',
    'these','they','thing','things','think','thinking','third','this',
    'those','though','thought','thoughts','thousand','thousands','three',
    'through','throughout','time','times','title','today','together',
    'told','tomorrow','tone','took','top','total','totally','tough',
    'toward','town','track','trade','traditional','tradition','traffic',
    'tried','tries','trip','trouble','true','truly','trust','try','trying',
    'turn','turned','turns','twice','two','type','types','typical',
    'under','understand','understanding','union','united','university',
    'unless','until','up','upon','us','use','used','uses','using',
    'usually','value','values','various','very','view','viewed','views',
    'voice','voices','vote','voted','votes','waiting','want','wanted',
    'wants','war','warm','was','watch','watched','water','way','ways',
    'we','weak','week','weeks','well','went','were','west','western',
    'what','whatever','when','where','whether','which','while','white',
    'who','whole','whom','whose','why','wide','widely','wife','will',
    'willing','win','wind','window','wish','with','within','without',
    'woman','women','won','wonder','wonderful','word','words','work',
    'worked','worker','workers','working','works','world','worry',
    'worse','worst','worth','would','write','writer','writers','writing',
    'written','wrote','year','years','yes','yet','you','young','younger',
    'your','yours','zero'
  ];
  w text := lower(word);
BEGIN
  RETURN w = ANY(common_words);
END;
$$;

-- Function to extract difficult vocabulary words from article text
CREATE OR REPLACE FUNCTION extract_difficult_vocabulary(article_text text, article_title text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  words text[];
  unique_words text[];
  difficult_words text[];
  w text;
  result jsonb := '[]'::jsonb;
  i integer;
  vc_word text;
  vc_pos text;
  vc_meaning text;
  vc_example text;
  vc_pron text;
  vc_syn text[];
  vc_ant text[];
  found boolean;
BEGIN
  IF article_text IS NULL OR article_text = '' THEN
    article_text := article_title;
  END IF;
  
  -- Extract all words, lowercase, alpha only
  words := regexp_split_to_array(lower(regexp_replace(article_text, '[^a-zA-Z\s]', ' ', 'g')), '\s+');
  
  -- Filter: unique, not common, length >= 8
  SELECT array_agg(DISTINCT x) INTO unique_words
  FROM unnest(words) AS x
  WHERE length(x) >= 8
    AND NOT is_common_word(x)
    AND x ~ '^[a-z]+$';
  
  IF unique_words IS NULL THEN
    SELECT array_agg(DISTINCT x) INTO unique_words
    FROM unnest(words) AS x
    WHERE length(x) >= 7
      AND NOT is_common_word(x)
      AND x ~ '^[a-z]+$';
  END IF;
  
  IF unique_words IS NULL THEN
    RETURN to_jsonb(ARRAY[
      jsonb_build_object(
        'word', 'comprehension',
        'phonetic', NULL,
        'part_of_speech', 'noun',
        'meaning', 'The ability to understand something fully.',
        'example', COALESCE(NULLIF(article_text,''), article_title),
        'synonyms', '[]'::jsonb,
        'antonyms', '[]'::jsonb
      )
    ]);
  END IF;
  
  -- Sort by length descending, take top 5
  SELECT array_agg(x ORDER BY length(x) DESC, x) INTO difficult_words
  FROM unnest(unique_words) AS x
  LIMIT 5;
  
  IF difficult_words IS NULL THEN
    difficult_words := unique_words[1:5];
  END IF;
  
  i := 1;
  FOREACH w IN ARRAY difficult_words LOOP
    IF i > 5 THEN EXIT; END IF;
    
    -- Look up in vocabulary_cache
    SELECT word, part_of_speech, meaning, example, pronunciation, synonyms, antonyms
    INTO vc_word, vc_pos, vc_meaning, vc_example, vc_pron, vc_syn, vc_ant
    FROM vocabulary_cache WHERE vocabulary_cache.word = w LIMIT 1;
    
    found := FOUND;
    
    IF found THEN
      result := result || to_jsonb(jsonb_build_object(
        'word', vc_word,
        'phonetic', vc_pron,
        'part_of_speech', COALESCE(vc_pos, 'noun'),
        'meaning', vc_meaning,
        'example', COALESCE(vc_example, article_text),
        'synonyms', to_jsonb(COALESCE(vc_syn, ARRAY[]::text[])),
        'antonyms', to_jsonb(COALESCE(vc_ant, ARRAY[]::text[]))
      ));
    ELSE
      result := result || to_jsonb(jsonb_build_object(
        'word', w,
        'phonetic', NULL,
        'part_of_speech', 'noun',
        'meaning', 'A term used in this article that may be unfamiliar to some readers.',
        'example', COALESCE(NULLIF(article_text,''), article_title),
        'synonyms', '[]'::jsonb,
        'antonyms', '[]'::jsonb
      ));
    END IF;
    
    i := i + 1;
  END LOOP;
  
  IF jsonb_array_length(result) = 0 THEN
    result := to_jsonb(ARRAY[
      jsonb_build_object(
        'word', 'comprehension',
        'phonetic', NULL,
        'part_of_speech', 'noun',
        'meaning', 'The ability to understand something fully.',
        'example', COALESCE(NULLIF(article_text,''), article_title),
        'synonyms', '[]'::jsonb,
        'antonyms', '[]'::jsonb
      )
    ]);
  END IF;
  
  RETURN result;
END;
$$;

-- Apply to ALL articles
UPDATE articles
SET story = jsonb_set(story, '{vocabulary}', 
  extract_difficult_vocabulary(
    COALESCE(story->>'main_story', story->>'summary', title),
    title
  ))
WHERE TRUE;