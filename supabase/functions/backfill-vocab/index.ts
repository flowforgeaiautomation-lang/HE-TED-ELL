import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BLOCKED = new Set([
  "article","source","report","update","people","official","information",
  "development","government","national","regional","general","several",
  "however","various","whether","against","already","although","instead",
  "despite","further","certain","because","through","between","another",
  "current","reported","statement","including","thursday","friday",
  "wednesday","tuesday","monday","saturday","sunday","january","february",
  "march","april","june","july","august","september","october","november",
  "december","according","reuters","hindustan","indian","express","times",
  "india","story","news","world","first","would","could","should","might",
  "years","year","month","week","today","yesterday","tomorrow","before",
  "after","during","while","about","their","there","these","those","other",
  "which","where","when","what","have","been","were","will","more","most",
  "some","many","such","also","than","only","very","much","well","even",
  "still","since","being","having","without","within","among","across",
  "toward","towards","upon","along","around","behind","below","above",
  "important","political","economic","social","public","policy","policies",
  "international","domestic","foreign","local","state","federal","central",
  "ministry","department","agency","agencies","service","services","system",
  "program","programme","project","projects","research","study","studies",
  "researcher","researchers","scientist","scientists","professor","author",
  "writer","journalist","expert","specialist","analyst","director","manager",
  "executive","officer","president","minister","secretary","chairman","leader",
  "member","committee","council","assembly","parliament","senate","congress",
  "court","judge","justice","lawyer","attorney","case","legal","illegal",
  "company","companies","corporate","corporation","business","industry",
  "market","markets","financial","finance","economy","economic","growth",
  "investment","investor","investors","revenue","profit","loss","budget",
  "percent","percentage","figure","figures","number","numbers","data",
  "statistics","statistic","measure","measured","measures","method",
  "approach","process","processes","procedure","procedures","practice",
  "practices","technique","techniques","technology","technologies","technical",
  "digital","software","hardware","computer","computers","internet","online",
  "website","platform","application","device","equipment","machine","machines",
  "vehicle","vehicles","aircraft","ship","ships","boat","boats","train",
  "trains","plane","planes","airport","railway","highway","road","roads",
  "bridge","bridges","building","buildings","construction","structure",
  "structures","facility","facilities","hospital","schools","college",
  "university","institute","institutes","center","centre","centers","centres",
  "station","stations","base","bases","campus","office","offices","room",
  "rooms","area","areas","region","regions","zone","zones","district",
  "districts","province","provinces","territory","territories","country",
  "countries","nation","nations","capital","city","cities","town","towns",
  "village","villages","community","communities","society","societies",
  "culture","cultural","history","historical","tradition","traditional",
  "modern","ancient","classical","contemporary","current","present","future",
  "past","recent","previous","former","latter","early","later","middle",
  "beginning","ending","start","started","starting","begin","began","end",
  "ended","ending","finish","finished","finishing","complete","completed",
  "entire","whole","total","full","partial","half","quarter","third",
  "second","seconds","minute","minutes","hour","hours","day","days",
  "night","nights","morning","evening","afternoon","weekend","season",
  "seasons","summer","winter","spring","autumn","fall","weather","climate",
  "temperature","rain","snow","wind","storm","storms","cloud","clouds",
  "sky","sun","moon","star","stars","planet","planets","earth","space",
  "universe","galaxy","galaxies","solar","lunar","cosmic","cosmos","energy",
  "power","powers","force","forces","motion","movement","movements","action",
  "actions","reaction","reactions","change","changed","changing","changes",
  "transform","transformation","convert","conversion","adapt","adaptation",
  "evolve","evolution","develop","developed","developing","create","created",
  "creating","creation","produce","produced","producing","production","product",
  "products","manufacture","manufactured","manufacturing","design","designed",
  "designing","engineer","engineering","engineered","build","built","building",
  "make","made","making","assemble","assembled","assembling","assembly",
]);

async function fetchDictionaryEntry(word: string): Promise<any | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: c.signal,
      headers: { "user-agent": "TheUnitedHell/1.0" },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) return null;
    const entry = data[0];
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    if (!meanings.length) return null;
    const first = meanings[0];
    const defs = Array.isArray(first?.definitions) ? first.definitions : [];
    if (!defs.length) return null;
    const def = defs[0]?.definition || "";
    if (!def) return null;
    const partOfSpeech = first?.partOfSpeech || "";
    const synonyms = Array.from(new Set(
      [first?.synonyms || [], defs.flatMap((d: any) => d.synonyms || [])].flat().filter(Boolean),
    )).slice(0, 5) as string[];
    const antonyms = Array.from(new Set(
      [first?.antonyms || [], defs.flatMap((d: any) => d.antonyms || [])].flat().filter(Boolean),
    )).slice(0, 5) as string[];
    const pronunciation = entry?.phonetic || entry?.phonetics?.find((p: any) => p.text)?.text;
    const example = defs.find((d: any) => d.example)?.example;
    return {
      word,
      partOfSpeech: partOfSpeech || undefined,
      meaning: def,
      simpleExplanation: def.split(/[,;]\s*/)[0].trim(),
      example: example || undefined,
      synonyms: synonyms.length ? synonyms : undefined,
      antonyms: antonyms.length ? antonyms : undefined,
      pronunciation: pronunciation || undefined,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const url = new URL(req.url);
    const batchLimit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);

    // Find articles with < 4 vocabulary entries
    const { data: articles } = await supabase
      .from("articles")
      .select("id, title, dek, story")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(5000);

    const candidates = (articles ?? []).filter((a: any) => {
      const vocab = a.story?.vocabulary;
      return !vocab || !Array.isArray(vocab) || vocab.length < 4;
    }).slice(0, batchLimit);

    let updated = 0;
    let failed = 0;

    for (const article of candidates) {
      try {
        const story = article.story || {};
        const existingVocab = Array.isArray(story.vocabulary) ? story.vocabulary : [];
        const newVocab = [...existingVocab];

        // Build text for word extraction
        const articleText = [
          article.title || "",
          article.dek || "",
          story.summary || "",
          story.main_story || "",
          story.background || "",
          story.why_it_matters || "",
          story.expert_analysis || "",
        ].join(" ").toLowerCase();

        // Extract candidate words
        const words = Array.from(new Set(
          (articleText.match(/[a-z][a-z-]{6,}/g) || [])
            .map((w) => w.replace(/^-|-$/g, ""))
            .filter((w) => !BLOCKED.has(w))
            .filter((w) => !newVocab.some((v: any) => v?.word?.toLowerCase() === w))
        )).slice(0, 20);

        // Look up each word
        for (const word of words) {
          if (newVocab.length >= 5) break;

          // Check cache first
          const { data: cached } = await supabase
            .from("vocabulary_cache")
            .select("*")
            .ilike("word", word)
            .maybeSingle();

          if (cached?.meaning) {
            newVocab.push({
              word: cached.word,
              partOfSpeech: cached.part_of_speech || undefined,
              meaning: cached.meaning,
              simpleExplanation: cached.simple_explanation || undefined,
              example: cached.example || undefined,
              synonyms: cached.synonyms || undefined,
              antonyms: cached.antonyms || undefined,
              pronunciation: cached.pronunciation || undefined,
            });
            continue;
          }

          // Fetch from dictionary API
          const entry = await fetchDictionaryEntry(word);
          if (entry && entry.meaning) {
            newVocab.push(entry);
            // Cache it
            await supabase.from("vocabulary_cache").upsert({
              word: word.toLowerCase(),
              part_of_speech: entry.partOfSpeech || null,
              meaning: entry.meaning,
              simple_explanation: entry.simpleExplanation || null,
              example: entry.example || null,
              synonyms: entry.synonyms || null,
              antonyms: entry.antonyms || null,
              pronunciation: entry.pronunciation || null,
              source: "dictionaryapi.dev",
              search_count: 1,
              last_searched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "word" });
          }
        }

        if (newVocab.length >= 4) {
          const newStory = { ...story, vocabulary: newVocab.slice(0, 5) };
          const { error } = await supabase
            .from("articles")
            .update({ story: newStory })
            .eq("id", article.id);
          if (error) {
            failed++;
          } else {
            updated++;
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Count remaining
    const { data: allArticles } = await supabase
      .from("articles")
      .select("id, story")
      .eq("is_published", true)
      .limit(5000);

    const remaining = (allArticles ?? []).filter((a: any) => {
      const vocab = a.story?.vocabulary;
      return !vocab || !Array.isArray(vocab) || vocab.length < 4;
    }).length;

    return new Response(
      JSON.stringify({
        ok: true,
        attempted: candidates.length,
        updated,
        failed,
        remaining,
        at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
