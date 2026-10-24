// v17 — Vocabulary generation, 24-section format, expanded politics/cybersecurity feeds, multi-provider AI, new API keys
// Markets/football/cricket/AI/cybersecurity/politics RSS feeds, financial APIs, HuggingFace provider
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
// --- API Keys (env vars with hardcoded fallbacks) ---
const GEMINI_KEYS = [
  Deno.env.get("GEMINI_API_KEY") || "AQ.Ab8RN6I5_lnT7QdXx0XJMsa2OqouwyRvPuZetdIejv9rHLXg6Q",
  Deno.env.get("GEMINI_API_KEY_2") || "gvH3MjRx40Tx0hpDp4nBrOUeJimA1Tl2aqwaEXj6cVHjWTwSEcoxuRw1",
  Deno.env.get("GEMINI_API_KEY_3") || "AQ.Ab8RN6JcEw0pHcAuu1dbo2QO26_U2LNTtsgKGQhHq61XJJxPNg",
].filter(Boolean);
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "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";
const OPENAI_KEY_2 = Deno.env.get("OPENAI_API_KEY_2") || "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";
const HUGGINGFACE_KEY = Deno.env.get("HUGGINGFACE_API_KEY") || "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";
const GROQ_KEY = Deno.env.get("GROQ_API_KEY") || "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";
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || "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";
const PEXELS_KEY = Deno.env.get("PEXELS_API_KEY") || "gvH3MjRx40Tx0hpDp4nBrOUeJimA1Tl2aqwaEXj6cVHjWTwSEcoxuRw1";
const GNEWS_KEY = Deno.env.get("GNEWS_API_KEY") || "669230c8aa8bf07f4b97b47eb498993c";
const NEWSDATA_KEY = Deno.env.get("NEWSDATA_API_KEY") || "pub_c7c16037979149979aad8331679a1fdd";
const MEDIASTACK_KEY = Deno.env.get("MEDIASTACK_API_KEY") || "c7b841684cfffb02ccf94c4414130a6b";
const CURRENTS_KEY = Deno.env.get("CURRENTS_API_KEY") || "ZabbMWxPqqdUpkE9zfddMVV94VIbd2BqYUpHzS_QWHRRvmmc";
const WORLDNEWS_KEY = Deno.env.get("WORLDNEWS_API_KEY") || "97adf3b0aabd4c50ba9a40420a269e60";
const NEWSAPI_KEY = Deno.env.get("NEWSAPI_KEY") || "344aae8ba4c14c988a63202624e720ca";
const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY") || "d9kccs1r01qq9sqfu130d9kccs1r01qq9sqfu13g";
const FMP_KEY = Deno.env.get("FMP_API_KEY") || "Gmej9XaScIABNc9kxCZ8aDO6g8zeVuJx";

let geminiKeyIdx = 0;
const GEMINI_MODEL = "gemini-2.5-flash";
function getGeminiUrl(): string {
  const key = GEMINI_KEYS[geminiKeyIdx % GEMINI_KEYS.length];
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
}

// --- RSS Feeds ---
interface RSSFeed { source: string; url: string; category: string; countryCode?: string; }
const RSS_FEEDS: RSSFeed[] = [
  // World / Geopolitics
  { source: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world" },
  { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world" },
  { source: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", category: "world" },
  { source: "AP World", url: "https://feeds.apnews.com/apf-worldnews", category: "world" },
  { source: "UN News", url: "https://news.un.org/feed/?lang=en", category: "world" },
  { source: "Euronews", url: "https://www.euronews.com/rss?level=theme&name=world", category: "world" },
  { source: "Sky News World", url: "https://feeds.skynews.com/feeds/rss/world_news.xml", category: "world" },
  { source: "DW World", url: "https://rss.dw.com/rdf/rss-en-world", category: "world" },
  { source: "France24", url: "https://www.france24.com/en/rss", category: "world" },
  // Politics
  { source: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", category: "politics" },
  { source: "The Hill", url: "https://thehill.com/feed/", category: "politics" },
  { source: "Politico", url: "https://www.politico.com/rss/politicopicks.xml", category: "politics" },
  { source: "Reuters Politics", url: "https://feeds.reuters.com/reuters/politicsNews", category: "politics" },
  { source: "Real Clear Politics", url: "https://www.realclearpolitics.com/index.xml", category: "politics" },
  { source: "FiveThirtyEight", url: "https://fivethirtyeight.com/features/feed/", category: "politics" },
  { source: "Guardian Politics", url: "https://www.theguardian.com/politics/rss", category: "politics" },
  { source: "AP Politics", url: "https://feeds.apnews.com/rss/apf-politics", category: "politics" },
  { source: "NYT Politics", url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", category: "politics" },
  { source: "Congress.gov", url: "https://www.congress.gov/rss/legislation-by-congress.xml", category: "politics" },
  // Science
  { source: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "science" },
  { source: "Phys.org", url: "https://phys.org/rss-feed/", category: "science" },
  { source: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml", category: "science" },
  { source: "New Scientist", url: "https://www.newscientist.com/feed/home/", category: "science" },
  { source: "Quanta Magazine", url: "https://www.quantamagazine.org/feed/", category: "science" },
  { source: "Live Science", url: "https://www.livescience.com/feeds/all", category: "science" },
  // Space
  { source: "NASA", url: "https://www.nasa.gov/news-release/feed/", category: "space" },
  { source: "Space.com", url: "https://www.space.com/feeds/all", category: "space" },
  { source: "Spaceflight Now", url: "https://spaceflightnow.com/feed/", category: "space" },
  { source: "Universe Today", url: "https://www.universetoday.com/feed/", category: "space" },
  { source: "Space News", url: "https://spacenews.com/feed/", category: "space" },
  // Astronomy
  { source: "Sky & Telescope", url: "https://skyandtelescope.org/feed/", category: "astronomy" },
  { source: "Astronomy Magazine", url: "https://astronomy.com/rss/news", category: "astronomy" },
  // Technology
  { source: "TechCrunch", url: "https://techcrunch.com/feed/", category: "technology" },
  { source: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "technology" },
  { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "technology" },
  { source: "Wired", url: "https://www.wired.com/feed/rss", category: "technology" },
  { source: "CNET", url: "https://www.cnet.com/rss/news/", category: "technology" },
  { source: "Engadget", url: "https://www.engadget.com/rss.xml", category: "technology" },
  { source: "BGR", url: "https://bgr.com/feed/", category: "technology" },
  { source: "TNW", url: "https://thenextweb.com/feed", category: "technology" },
  // Artificial Intelligence
  { source: "MIT Tech Review AI", url: "https://www.technologyreview.com/feed/", category: "artificial-intelligence" },
  { source: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", category: "artificial-intelligence" },
  { source: "AI News", url: "https://artificialintelligence-news.com/feed/", category: "artificial-intelligence" },
  { source: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", category: "artificial-intelligence" },
  { source: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", category: "artificial-intelligence" },
  // Cybersecurity
  { source: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", category: "cybersecurity" },
  { source: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "cybersecurity" },
  { source: "Bleeping Computer", url: "https://www.bleepingcomputer.com/feed/", category: "cybersecurity" },
  { source: "Dark Reading", url: "https://www.darkreading.com/rss.xml", category: "cybersecurity" },
  { source: "Security Week", url: "https://www.securityweek.com/feed/", category: "cybersecurity" },
  { source: "CyberScoop", url: "https://www.cyberscoop.com/feed/", category: "cybersecurity" },
  { source: "Threatpost", url: "https://threatpost.com/feed/", category: "cybersecurity" },
  { source: "CSO Online", url: "https://www.csoonline.com/feed/", category: "cybersecurity" },
  { source: "Schneier on Security", url: "https://www.schneier.com/feed/", category: "cybersecurity" },
  { source: "Naked Security", url: "https://nakedsecurity.sophos.com/feed/", category: "cybersecurity" },
  // Markets / Business / Finance
  { source: "CNBC Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", category: "markets" },
  { source: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss", category: "markets" },
  { source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", category: "markets" },
  { source: "CNBC World", url: "https://www.cnbc.com/id/100725368/device/rss/rss.html", category: "world" },
  { source: "Seeking Alpha", url: "https://seekingalpha.com/market_currents.xml", category: "markets" },
  { source: "Investing.com", url: "https://www.investing.com/rss/news_25.rss", category: "markets" },
  // Economics
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "economics" },
  { source: "World Bank", url: "https://www.worldbank.org/en/news/all?format=rss", category: "economics" },
  { source: "Economic Times India", url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms", category: "economics" },
  // Health
  { source: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml", category: "health" },
  { source: "Medical News Today", url: "https://www.medicalnewstoday.com/newsfeeds/rss/medical_all.xml", category: "health" },
  { source: "STAT News", url: "https://www.statnews.com/feed/", category: "health" },
  { source: "WebMD", url: "https://rssfeeds.webmd.com/rss/rss.aspx?RSSid=1001", category: "health" },
  { source: "Harvard Health", url: "https://www.health.harvard.edu/blog/feed", category: "wellness" },
  // Climate / Environment
  { source: "Inside Climate News", url: "https://insideclimatenews.org/feed/", category: "climate" },
  { source: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", category: "climate" },
  { source: "Yale e360", url: "https://e360.yale.edu/feed.xml", category: "climate" },
  // Wildlife / Nature
  { source: "Mongabay", url: "https://news.mongabay.com/feed/", category: "nature" },
  { source: "National Geographic Animals", url: "https://www.nationalgeographic.com/animals/rss/", category: "wildlife" },
  // Sports — Football
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "football" },
  { source: "BBC Football", url: "https://feeds.bbci.co.uk/sport/football/rss.xml", category: "football" },
  { source: "Sky Sports", url: "https://www.skysports.com/rss/12040", category: "football" },
  { source: "ESPN", url: "https://www.espn.com/espn/rss/news", category: "football" },
  // Sports — Cricket
  { source: "ESPN Cricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", category: "cricket" },
  { source: "Cricbuzz", url: "https://www.cricbuzz.com/match-news/rss", category: "cricket" },
  { source: "ICC Cricket", url: "https://www.icc-cricket.com/rss", category: "cricket" },
  // Entertainment
  { source: "Variety", url: "https://variety.com/feed/", category: "movies" },
  { source: "Deadline", url: "https://deadline.com/feed/", category: "movies" },
  { source: "Billboard", url: "https://www.billboard.com/feed/", category: "music" },
  { source: "IGN", url: "https://feeds.feedburner.com/ign/games-all", category: "gaming" },
  { source: "Hollywood Reporter", url: "https://www.hollywoodreporter.com/feed/", category: "celebrities" },
  // Books / Culture
  { source: "NYT Books", url: "https://rss.nytimes.com/services/xml/rss/nyt/Books.xml", category: "books" },
  { source: "Smithsonian", url: "https://www.smithsonianmag.com/rss/latest_articles/", category: "culture" },
  { source: "Archaeology News", url: "https://www.archaeology.org/index.php?option=com_obrss&task=feed&id=5:archaeology-magazine-news&format=feed&Itemid=121", category: "archaeology" },
  // India
  { source: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss", category: "india" },
  { source: "Indian Express", url: "https://indianexpress.com/section/india/feed/", category: "india" },
  { source: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", category: "india" },
  { source: "NDTV Latest", url: "https://www.ndtv.com/rss/latest", category: "india" },
  // Electric Vehicles
  { source: "Electrek", url: "https://electrek.co/feed/", category: "electric-vehicles" },
  // Renewable Energy
  { source: "Renewable Energy World", url: "https://www.renewableenergyworld.com/feed/", category: "renewable-energy" },
  // Norway
  { source: "NRK Nyheter", url: "https://www.nrk.no/norge/toppsaker.rss", category: "world", countryCode: "NO" },
  { source: "NRK Utland", url: "https://www.nrk.no/utland/toppsaker.rss", category: "world", countryCode: "NO" },
  { source: "NRK Sport", url: "https://www.nrk.no/sport/toppsaker.rss", category: "football", countryCode: "NO" },
  { source: "NRK Kultur", url: "https://www.nrk.no/kultur/toppsaker.rss", category: "culture", countryCode: "NO" },
  { source: "NRK Vitenskap", url: "https://www.nrk.no/vitenskap/toppsaker.rss", category: "science", countryCode: "NO" },
  { source: "NRK Tech", url: "https://www.nrk.no/teknologi/toppsaker.rss", category: "technology", countryCode: "NO" },
  { source: "NRK Økonomi", url: "https://www.nrk.no/okonomi/toppsaker.rss", category: "economics", countryCode: "NO" },
  { source: "NRK Helse", url: "https://www.nrk.no/helse/toppsaker.rss", category: "health", countryCode: "NO" },
];

// --- News API category mapping ---
const NEWS_API_TOPICS = [
  { topic: "world", category: "world" },
  { topic: "technology", category: "technology" },
  { topic: "science", category: "science" },
  { topic: "health", category: "health" },
  { topic: "business", category: "markets" },
  { topic: "entertainment", category: "movies" },
  { topic: "sports", category: "football" },
  { topic: "environment", category: "climate" },
];

const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","can","this","that","these","those","it","its","as","if","then","than","so","not","no","yes","also","about","after","before","during","while","because","since","until","up","down","out","over","under","into","onto","off","above","below","between","through","against","new","said","says","say","one","two","more","most","some","any","all","each","every","other","such","only","own","same","too","very","just","now","here","there","when","where","which","who","whom","what","why","how","their","them","they","he","she","his","her","him","you","your","we","us","our","i","my","me","who","whose","which"]);

function slugify(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
function normalizeText(s: string): string { return (s || "").toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function stripHtml(s: string): string { return (s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#8217;/g, "'").replace(/&#8211;/g, "-").replace(/&#8230;/g, "...").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').trim(); }
function wordCount(s: string): number { return (s || "").trim().split(/\s+/).filter(Boolean).length; }

function extractKeywords(text: string, max: number): string[] {
  const clean = stripHtml(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = clean.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(e => e[0]);
}
function extractEntities(text: string): string[] {
  const clean = stripHtml(text);
  const words = clean.split(/\s+/);
  const entities: string[] = [];
  for (const w of words) {
    const stripped = w.replace(/[^A-Za-z]/g, "");
    if (stripped.length > 2 && stripped[0] === stripped[0].toUpperCase() && !STOP_WORDS.has(stripped.toLowerCase())) entities.push(stripped);
  }
  return [...new Set(entities)].slice(0, 8);
}
function extractNumbers(text: string): string[] {
  const clean = stripHtml(text);
  const matches = clean.match(/\b\d+(?:\.\d+)?(?:%|bn|million|billion|trillion)?\b/gi) || [];
  return [...new Set(matches)].slice(0, 5);
}

// --- AI Article Interface ---
interface AIArticle {
  headline: string; dek: string; main_story: string;
  what_happened: string; why_it_matters: string; how_it_happened: string;
  who_and_where: string; what_came_before: string; what_happens_next: string;
  key_developments: string[]; why_it_matters_text: string; did_you_know: string;
  historical_context: string; future_outlook: string; reader_takeaways: string[];
  key_numbers: { value: string; context: string }[];
  key_facts: string[];
  timeline: { date: string; event: string }[];
  related_topics: string[]; bottom_line: string;
  expert_analysis: string; quick_insights: string[];
  vocabulary: { word: string; partOfSpeech: string; meaning: string; simpleExplanation: string; example: string; synonyms: string[]; antonyms: string[]; pronunciation: string }[];
  quiz: { question: string; options: string[]; correct: number; explanation: string }[];
}

function buildPrompt(sourceText: string, sourceTitle: string, sourceName: string, category: string, keywords: string[], entities: string[], numbers: string[]): string {
  return `You are an expert journalist writing for "The United Hell", a news platform that publishes original, well-researched articles.

A news story has been identified from ${sourceName} with the source headline: "${sourceTitle}"

Source excerpt (for factual reference only — DO NOT copy any text from it):
"""
${sourceText.slice(0, 1500)}
"""

Key facts extracted: Keywords: ${keywords.join(", ")}. Entities: ${entities.join(", ")}. Numbers: ${numbers.join(", ")}. Category: ${category}.

Write a COMPLETELY ORIGINAL article about this story. Rules:
1. NEVER copy any phrase, sentence, or paragraph from the source text above.
2. Write natural, engaging English — no robotic filler like "Moreover", "Furthermore", "Consequently", "In turn", "Additionally", "provides a window into", "reporting highlights", "track this story".
3. Do NOT use generic templates like "Recent developments have brought attention to..." or "Observers note that...".
4. The headline must be original, specific, and attractive — not copied from the source headline.
5. The main_story must be at least 250 words, well-structured with short paragraphs, and genuinely informative about the ACTUAL event.
6. Explain the complete event: who, what, where, when, how, relevant causes, background, important numbers, consequences.
7. All sections must be specific to THIS story, not generic filler. If a section doesn't apply, leave it empty.
8. Do NOT invent names, quotations, measurements, expert opinions, or predictions.
9. Generate 3 quiz questions that test understanding of THIS article.
10. Use simple, professional, human-style journalism.

Return ONLY a JSON object (no markdown, no code fence) with this exact structure:
{
  "headline": "original attractive headline",
  "dek": "one-sentence summary (max 30 words)",
  "main_story": "full article body, 250+ words, multiple paragraphs separated by \\n\\n",
  "key_developments": ["development 1", "development 2", "development 3"],
  "why_it_matters": "2-3 sentences explaining significance",
  "did_you_know": "one interesting verified fact related to this topic",
  "historical_context": "1-2 sentences of genuine context about what came before",
  "future_outlook": "1-2 sentences on what may happen next",
  "reader_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "key_numbers": [{"value": "number", "context": "what it means"}],
  "timeline": [{"date": "date or timeframe", "event": "what happened"}],
  "related_topics": ["topic 1", "topic 2", "topic 3"],
  "bottom_line": "concise synthesis in 1-2 sentences",
  "quiz": [{"question": "q", "options": ["a","b","c","d"], "correct": 0, "explanation": "why"}]
}`;
}

function parseAIResponse(text: string): AIArticle | null {
  let parsed: any;
  try { parsed = JSON.parse(text); } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return null; }
  }
  if (!parsed.headline || !parsed.main_story) return null;
  return parsed as AIArticle;
}

// --- AI Provider 1: Gemini ---
async function generateWithGemini(prompt: string): Promise<AIArticle | null> {
  try {
    const resp = await fetch(getGeminiUrl(), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096, topP: 0.9, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) { if (resp.status === 429) geminiKeyIdx++; console.error(`[gemini] HTTP ${resp.status}`); return null; }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return parseAIResponse(text);
  } catch (e) { console.error(`[gemini] ${((e as Error).message).slice(0, 100)}`); return null; }
}

// --- AI Provider 2: OpenAI ---
async function generateWithOpenAI(prompt: string): Promise<AIArticle | null> {
  if (!OPENAI_KEY) return null;
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) { console.error(`[openai] HTTP ${resp.status} ${resp.status === 429 ? 'rate limited' : ''}`); if (OPENAI_KEY_2) { try { const r2 = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY_2}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096, response_format: { type: "json_object" } }), signal: AbortSignal.timeout(15000) }); if (r2.ok) { const d2 = await r2.json(); const t2 = d2?.choices?.[0]?.message?.content; if (t2) return parseAIResponse(t2); } } catch {} } return null; }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return parseAIResponse(text);
  } catch (e) { console.error(`[openai] ${((e as Error).message).slice(0, 100)}`); return null; }
}

// --- AI Provider 3: Groq ---
async function generateWithGroq(prompt: string): Promise<AIArticle | null> {
  if (!GROQ_KEY) return null;
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: "openai/gpt-oss-120b", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096 }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) { console.error(`[groq] HTTP ${resp.status}`); return null; }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return parseAIResponse(text);
  } catch (e) { console.error(`[groq] ${((e as Error).message).slice(0, 100)}`); return null; }
}

// --- AI Provider 4: OpenRouter ---
async function generateWithOpenRouter(prompt: string): Promise<AIArticle | null> {
  if (!OPENROUTER_KEY) return null;
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENROUTER_KEY}` },
      body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) { console.error(`[openrouter] HTTP ${resp.status}`); return null; }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return parseAIResponse(text);
  } catch (e) { console.error(`[openrouter] ${((e as Error).message).slice(0, 100)}`); return null; }
}

// --- AI Provider 5: HuggingFace ---
async function generateWithHuggingFace(prompt: string): Promise<AIArticle | null> {
  if (!HUGGINGFACE_KEY) return null;
  try {
    const resp = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-70B-Instruct", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${HUGGINGFACE_KEY}` },
      body: JSON.stringify({ inputs: prompt, parameters: { temperature: 0.7, max_new_tokens: 4096, return_full_text: false } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) { console.error(`[huggingface] HTTP ${resp.status}`); return null; }
    const data = await resp.json();
    const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
    if (!text) return null;
    return parseAIResponse(text);
  } catch (e) { console.error(`[huggingface] ${((e as Error).message).slice(0, 100)}`); return null; }
}

// --- Multi-provider AI generation with fallback ---
async function generateArticle(sourceText: string, sourceTitle: string, sourceName: string, category: string, keywords: string[], entities: string[], numbers: string[]): Promise<AIArticle | null> {
  const prompt = buildPrompt(sourceText, sourceTitle, sourceName, category, keywords, entities, numbers);
  // Try Gemini once (rotates keys on rate limit)
  const geminiResult = await generateWithGemini(prompt);
  if (geminiResult) return geminiResult;
  // Fallback to OpenRouter (works reliably)
  const orResult = await generateWithOpenRouter(prompt);
  if (orResult) return orResult;
  // Fallback to OpenAI (credits may be exhausted)
  const openaiResult = await generateWithOpenAI(prompt);
  if (openaiResult) return openaiResult;
  // Fallback to Groq (rate-limited)
  const groqResult = await generateWithGroq(prompt);
  if (groqResult) return groqResult;
  // Fallback to HuggingFace
  const hfResult = await generateWithHuggingFace(prompt);
  if (hfResult) return hfResult;
  return null;
}

// --- Pexels image search ---
async function pexelsSearch(query: string, exclude: Set<string>): Promise<string | null> {
  if (!PEXELS_KEY) return null;
  try {
    const resp = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`, {
      headers: { Authorization: PEXELS_KEY }, signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const photos = data?.photos || [];
    for (const p of photos) {
      const url = p?.src?.large2x || p?.src?.large || p?.src?.original;
      if (url && !exclude.has(url)) return url;
    }
    return null;
  } catch { return null; }
}

// --- Financial API: Fetch market movers and financial news ---
async function fetchFinancialNews(): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  const now = new Date().toISOString();

  try {
    const resp = await fetch(`https://finnhub.io/api/v1/stock/market-news?category=general&token=${FINNHUB_KEY}`, { signal: AbortSignal.timeout(10000) });
    if (resp.ok) {
      const movers = await resp.json();
      if (Array.isArray(movers)) {
        for (const m of movers.slice(0, 10)) {
          if (!m?.headline || !m?.url) continue;
          items.push({
            title: stripHtml(m.headline), link: m.url,
            description: m.summary || m.headline,
            date: m.datetime ? new Date(m.datetime * 1000).toISOString() : now,
            source: "Finnhub", category: "markets",
          });
        }
      }
    }
  } catch {}

  try {
    const resp = await fetch(`https://finnhub.io/api/v1/news/crypto?token=${FINNHUB_KEY}`, { signal: AbortSignal.timeout(10000) });
    if (resp.ok) {
      const crypto = await resp.json();
      if (Array.isArray(crypto)) {
        for (const c of crypto.slice(0, 5)) {
          if (!c?.headline || !c?.url) continue;
          items.push({
            title: stripHtml(c.headline), link: c.url,
            description: c.summary || c.headline,
            date: c.datetime ? new Date(c.datetime * 1000).toISOString() : now,
            source: "Finnhub Crypto", category: "markets",
          });
        }
      }
    }
  } catch {}

  try {
    const resp = await fetch(`https://finnhub.io/api/v1/news/forex?token=${FINNHUB_KEY}`, { signal: AbortSignal.timeout(10000) });
    if (resp.ok) {
      const forex = await resp.json();
      if (Array.isArray(forex)) {
        for (const f of forex.slice(0, 5)) {
          if (!f?.headline || !f?.url) continue;
          items.push({
            title: stripHtml(f.headline), link: f.url,
            description: f.summary || f.headline,
            date: f.datetime ? new Date(f.datetime * 1000).toISOString() : now,
            source: "Finnhub Forex", category: "markets",
          });
        }
      }
    }
  } catch {}

  try {
    const resp = await fetch(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_KEY}`, { signal: AbortSignal.timeout(10000) });
    if (resp.ok) {
      const gainers = await resp.json();
      if (Array.isArray(gainers)) {
        for (const g of gainers.slice(0, 5)) {
          if (!g?.symbol || !g?.name) continue;
          const changePct = parseFloat(g.changesPercentage) || 0;
          if (Math.abs(changePct) < 3) continue;
          const direction = changePct > 0 ? "surged" : "plunged";
          items.push({
            title: `${g.name} (${g.symbol}) ${direction} ${Math.abs(changePct).toFixed(1)}% as trading volumes spike`,
            link: `https://www.google.com/finance/quote/${g.symbol}`,
            description: `${g.name}, trading under the symbol ${g.symbol}, ${direction} ${Math.abs(changePct).toFixed(2)}% to ${parseFloat(g.price).toFixed(2)}. The stock was among the biggest market movers in today's session.`,
            date: now,
            source: "FMP Market Movers", category: "markets",
          });
        }
      }
    }
  } catch {}

  try {
    const resp = await fetch(`https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${FMP_KEY}`, { signal: AbortSignal.timeout(10000) });
    if (resp.ok) {
      const losers = await resp.json();
      if (Array.isArray(losers)) {
        for (const l of losers.slice(0, 5)) {
          if (!l?.symbol || !l?.name) continue;
          const changePct = parseFloat(l.changesPercentage) || 0;
          if (Math.abs(changePct) < 4) continue;
          items.push({
            title: `${l.name} (${l.symbol}) drops ${Math.abs(changePct).toFixed(1)}% amid heavy selling pressure`,
            link: `https://www.google.com/finance/quote/${l.symbol}`,
            description: `${l.name}, listed as ${l.symbol}, fell ${Math.abs(changePct).toFixed(2)}% to ${parseFloat(l.price).toFixed(2)}.`,
            date: now,
            source: "FMP Market Movers", category: "markets",
          });
        }
      }
    }
  } catch {}

  return items;
}

// --- News API fetchers ---
interface NewsItem { title: string; link: string; description: string; date: string; source: string; category: string; countryCode?: string; }

async function fetchRSS(feed: RSSFeed): Promise<NewsItem[]> {
  try {
    const resp = await fetch(feed.url, { headers: { "User-Agent": "TheUnitedHell/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const text = await resp.text();
    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 3).map((item) => {
      const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
      const desc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] || item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
      const date = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || new Date().toUTCString();
      return { title: stripHtml(title), link, description: desc, date, source: feed.source, category: feed.category, countryCode: feed.countryCode };
    }).filter((i) => i.title && i.link && wordCount(i.description) >= 8);
  } catch { return []; }
}

async function fetchGNews(): Promise<NewsItem[]> {
  if (!GNEWS_KEY) return [];
  const items: NewsItem[] = [];
  for (const t of NEWS_API_TOPICS.slice(0, 8)) {
    try {
      const resp = await fetch(`https://gnews.io/api/v4/top-headlines?topic=${t.topic}&lang=en&max=5&apikey=${GNEWS_KEY}`, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const a of (data?.articles || [])) {
        items.push({ title: stripHtml(a.title || ""), link: a.url || "", description: a.description || "", date: a.publishedAt || new Date().toISOString(), source: a.source?.name || "GNews", category: t.category });
      }
    } catch {}
  }
  return items;
}

async function fetchNewsData(): Promise<NewsItem[]> {
  if (!NEWSDATA_KEY) return [];
  const items: NewsItem[] = [];
  const catMap: Record<string, string> = { entertainment: "movies", sports: "football", business: "markets", environment: "climate" };
  for (const cat of ["world", "technology", "science", "health", "business", "environment", "sports", "entertainment"]) {
    try {
      const resp = await fetch(`https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&category=${cat}&language=en&size=5`, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const a of (data?.results || [])) {
        items.push({ title: stripHtml(a.title || ""), link: a.link || "", description: a.description || a.content || "", date: a.pubDate || new Date().toISOString(), source: a.source_id || "NewsData", category: catMap[cat] || cat });
      }
    } catch {}
  }
  return items;
}

async function fetchMediaStack(): Promise<NewsItem[]> {
  if (!MEDIASTACK_KEY) return [];
  const items: NewsItem[] = [];
  const catMap: Record<string, string> = { entertainment: "movies", sports: "football", business: "markets", general: "world", environment: "climate" };
  for (const cat of ["general", "technology", "science", "health", "business", "entertainment", "sports", "environment"]) {
    try {
      const resp = await fetch(`https://api.mediastack.com/v1/news?access_key=${MEDIASTACK_KEY}&categories=${cat}&languages=en&limit=5`, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const a of (data?.data || [])) {
        items.push({ title: stripHtml(a.title || ""), link: a.url || "", description: a.description || "", date: a.published_at || new Date().toISOString(), source: a.source || "MediaStack", category: catMap[cat] || cat });
      }
    } catch {}
  }
  return items;
}

async function fetchCurrents(): Promise<NewsItem[]> {
  if (!CURRENTS_KEY) return [];
  try {
    const resp = await fetch(`https://api.currentsapi.services/v1/latest-news?apiKey=${CURRENTS_KEY}&language=en`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    const items: NewsItem[] = [];
    for (const a of (data?.news || []).slice(0, 20)) {
      items.push({ title: stripHtml(a.title || ""), link: a.url || "", description: a.description || "", date: a.published || new Date().toISOString(), source: a.author || "Currents", category: "world" });
    }
    return items;
  } catch { return []; }
}

async function fetchWorldNews(): Promise<NewsItem[]> {
  if (!WORLDNEWS_KEY) return [];
  const items: NewsItem[] = [];
  try {
    const resp = await fetch(`https://api.worldnewsapi.com/search-news?api-key=${WORLDNEWS_KEY}&language=en&number=20`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    for (const a of (data?.news || [])) {
      items.push({ title: stripHtml(a.title || ""), link: a.url || "", description: a.summary || a.text || "", date: a.publish_date || new Date().toISOString(), source: a.author || "WorldNews", category: "world" });
    }
  } catch {}
  return items;
}

async function fetchNewsAPI(): Promise<NewsItem[]> {
  if (!NEWSAPI_KEY) return [];
  const items: NewsItem[] = [];
  const catMap: Record<string, string> = { business: "markets", entertainment: "movies", sports: "football", science: "science", health: "health", technology: "technology", general: "world" };
  for (const cat of ["business", "technology", "science", "health", "sports", "entertainment", "general"]) {
    try {
      const resp = await fetch(`https://newsapi.org/v2/top-headlines?category=${cat}&language=en&pageSize=5&apiKey=${NEWSAPI_KEY}`, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const a of (data?.articles || [])) {
        items.push({ title: stripHtml(a.title || ""), link: a.url || "", description: a.description || a.content || "", date: a.publishedAt || new Date().toISOString(), source: a.source?.name || "NewsAPI", category: catMap[cat] || cat });
      }
    } catch {}
  }
  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const startTime = Date.now();
  const url = new URL(req.url);
  const maxItems = parseInt(url.searchParams.get("maxItems") || "10", 10);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    try { await supabase.rpc("update_trending_scores"); } catch {}

    const { data: existing } = await supabase.from("articles").select("title, sources, cover_image_url").order("published_at", { ascending: false }).limit(2000);
    const existingTitles = new Set((existing || []).map((e: any) => normalizeText(e.title)));
    const existingUrls = new Set<string>();
    for (const e of (existing || [])) { for (const s of (e.sources || [])) if (s?.url) existingUrls.add(s.url); }
    const existingImages = new Set<string>((existing || []).map((e: any) => e.cover_image_url).filter(Boolean));

    // Fetch from ALL sources in parallel — including financial APIs
    const [rssResults, gnewsItems, newsdataItems, mediastackItems, currentsItems, financialItems, worldnewsItems, newsapiItems] = await Promise.all([
      Promise.allSettled(RSS_FEEDS.map((f) => fetchRSS(f))),
      fetchGNews(),
      fetchNewsData(),
      fetchMediaStack(),
      fetchCurrents(),
      fetchFinancialNews(),
      fetchWorldNews(),
      fetchNewsAPI(),
    ]);

    const allItems: NewsItem[] = [];
    for (const r of rssResults) { if (r.status === "fulfilled") allItems.push(...r.value); }
    allItems.push(...gnewsItems, ...newsdataItems, ...mediastackItems, ...currentsItems, ...financialItems, ...worldnewsItems, ...newsapiItems);

    const cutoff = Date.now() - 2 * 86400000;
    const seen = new Set<string>();
    const fresh = allItems.filter((item) => {
      const ts = new Date(item.date).getTime();
      if (isNaN(ts) || ts < cutoff) return false;
      const tn = normalizeText(item.title);
      if (existingTitles.has(tn) || existingUrls.has(item.link)) return false;
      if (seen.has(tn)) return false;
      seen.add(tn);
      return true;
    });

    console.log(`[ingest] Fetched ${allItems.length} items (RSS + News APIs + Financial), ${fresh.length} fresh`);

    let inserted = 0, errors = 0, aiGenerated = 0;
    const batchImages = new Set<string>();

    // Category-balanced selection: prioritize categories with few articles in DB
    const PRIORITY_CATS = ["markets", "football", "cricket", "artificial-intelligence", "cybersecurity", "politics"];
    const byCat = new Map<string, NewsItem[]>();
    for (const item of fresh) {
      const arr = byCat.get(item.category) || [];
      arr.push(item);
      byCat.set(item.category, arr);
    }
    const selected: NewsItem[] = [];
    // First pass: 1 item from each priority category (respecting maxItems)
    for (const cat of PRIORITY_CATS) {
      if (selected.length >= maxItems) break;
      const arr = byCat.get(cat);
      if (arr && arr.length > 0) { selected.push(arr.shift()!); }
    }
    // Second pass: round-robin across ALL categories to fill up to maxItems
    const allCats = [...byCat.keys()].sort();
    let idx = 0;
    while (selected.length < maxItems) {
      let added = false;
      for (const cat of allCats) {
        if (selected.length >= maxItems) break;
        const arr = byCat.get(cat)!;
        if (arr.length > 0) { selected.push(arr.shift()!); added = true; }
      }
      if (!added) break;
      idx++;
      if (idx > 20) break;
    }
    console.log(`[ingest] Selected ${selected.length} items across ${new Set(selected.map(s => s.category)).size} categories: ${[...new Set(selected.map(s => s.category))].join(", ")}`);

    for (const item of selected) {
      const sourceText = stripHtml(item.description) + " " + item.title;
      const keywords = extractKeywords(sourceText, 10);
      const entities = extractEntities(sourceText);
      const numbers = extractNumbers(sourceText);
      if (keywords.length < 2) { errors++; continue; }

      const aiArticle = await generateArticle(sourceText, item.title, item.source, item.category, keywords, entities, numbers);
      if (!aiArticle) { console.log(`[ingest] Skipped (all AI providers failed): ${item.title.slice(0, 60)}`); errors++; continue; }

      const headline = aiArticle.headline;
      const dek = aiArticle.dek;
      const mainStory = aiArticle.main_story;
      const wc = wordCount(mainStory);
      aiGenerated++;

      if (wc < 120) { console.error(`[ingest] Rejected: word count ${wc} too low`); errors++; continue; }

      // Originality check
      const srcSentences = sourceText.toLowerCase().split(/[.!?]+/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 8);
      const mainLower = mainStory.toLowerCase();
      let hasCopy = false;
      for (const ss of srcSentences) { if (mainLower.includes(ss)) { hasCopy = true; break; } }
      if (hasCopy) { console.error(`[originality] Rejected: source sentence found`); errors++; continue; }

      // Duplicate headline check
      const headlineNorm = normalizeText(headline);
      if (existingTitles.has(headlineNorm)) { errors++; continue; }
      existingTitles.add(headlineNorm);

      // Vague content check
      if (/provides a window into|reporting highlights|track this story|Recent developments have brought attention to|Observers note that|fits within the broader/i.test(mainStory)) {
        console.error(`[quality] Rejected: vague/filler content`); errors++; continue;
      }

      // Entity-based Pexels image search
      const imgEntities: string[] = [];
      if (aiArticle.related_topics) imgEntities.push(...aiArticle.related_topics.slice(0, 2));
      if (entities.length > 0) imgEntities.push(...entities.slice(0, 2));
      const imgQuery = imgEntities.length > 0 ? imgEntities.join(" ").slice(0, 80) : keywords.slice(0, 3).join(" ");

      let coverImage = await pexelsSearch(imgQuery, new Set([...existingImages, ...batchImages]));
      if (!coverImage) coverImage = await pexelsSearch(`${item.category} ${keywords.slice(0, 2).join(" ")}`, new Set([...existingImages, ...batchImages]));
      if (!coverImage) { console.log(`[ingest] Skipped (no image found): ${headline.slice(0, 60)}`); errors++; continue; }
      batchImages.add(coverImage);

      const slug = `${slugify(headline)}-${Math.random().toString(36).slice(2, 6)}`;

      const story = {
          summary: dek, main_story: mainStory,
          what_happened: (aiArticle as any).what_happened || "",
          why_it_matters: aiArticle.why_it_matters || "",
          how_it_happened: (aiArticle as any).how_it_happened || "",
          who_and_where: (aiArticle as any).who_and_where || "",
          what_came_before: (aiArticle as any).what_came_before || aiArticle.historical_context || "",
          what_happens_next: (aiArticle as any).what_happens_next || "",
          background: aiArticle.historical_context || "",
          key_developments: aiArticle.key_developments || [],
          key_facts: (aiArticle as any).key_facts || [],
          quick_insights: (aiArticle as any).quick_insights || aiArticle.reader_takeaways?.slice(0, 3) || [],
          why_it_matters_text: (aiArticle as any).why_it_matters_text || aiArticle.why_it_matters || "",
          did_you_know: aiArticle.did_you_know || "",
          historical_context: aiArticle.historical_context || "",
          future_outlook: aiArticle.future_outlook || "",
          reader_takeaways: aiArticle.reader_takeaways || [],
          key_numbers: aiArticle.key_numbers || [],
          timeline: aiArticle.timeline || [],
          related_topics: aiArticle.related_topics || [],
          bottom_line: aiArticle.bottom_line || "",
          expert_analysis: (aiArticle as any).expert_analysis || "",
          vocabulary: (aiArticle as any).vocabulary || [],
          people: entities.slice(0, 3).map(e => ({ name: e })),
          organizations: [],
          countries: item.countryCode ? [{ code: item.countryCode }] : [],
          sources: [{ name: item.source, url: item.link }],
          quiz: aiArticle.quiz || [],
        };

      const { error } = await supabase.from("articles").insert({
        slug, title: headline, dek, category: item.category, cover_image_url: coverImage,
        read_time_minutes: Math.max(3, Math.min(8, Math.ceil(wc / 200))),
        source_count: 1, sources: [{ name: item.source, url: item.link }], story,
        is_published: true, published_at: new Date().toISOString(),
      });

      if (error) {
        if (!/duplicate|unique/i.test(error.message)) console.error(`[ingest] Insert error: ${error.message}`);
        errors++;
      } else {
        inserted++;
        console.log(`[ingest] Inserted (AI): ${headline.slice(0, 70)}`);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ingest] Done: ${inserted} inserted (${aiGenerated} AI, ${errors} skipped) in ${elapsed}ms`);
    return new Response(JSON.stringify({ ok: true, fetched: allItems.length, fresh: fresh.length, inserted, errors, aiGenerated, maxItems, elapsed_ms: elapsed, timestamp: new Date().toISOString() }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[fetch-news-articles] fatal:", error);
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message, timestamp: new Date().toISOString() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
