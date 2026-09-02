// Server-only news ingestion + AI processing pipeline.
// Pulls REAL, RECENT news per category, processes with Qwen via OpenRouter,
// fetches Pexels cover when source lacks one, and inserts into `articles`.
// Concurrency parallelised so manual "Curate More" returns fast.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { orJson, pexelsImage, getCategoryFallbackImage } from "./openrouter.server";
import { CATEGORIES } from "./categories";
import { lookupWords } from "./dictionary.server";
import type { VocabEntry } from "./types";

type RawItem = {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string | null;
  topicHint?: string;
  forcedCategory?: string;
  allowStoredText?: boolean;
};

const ALLOWED_SLUGS = CATEGORIES.filter((c) => c.slug !== "all").map((c) => c.slug);

// Category-specific keyword queries — these drive REAL targeted searches per topic.
// Subset of high-value slugs; the AI still classifies into any allowed slug.
const CATEGORY_QUERIES: { slug: string; q: string }[] = [
  // Money & Success
  { slug: "billionaires", q: "Elon Musk OR Jeff Bezos OR Mark Zuckerberg OR Bernard Arnault OR Mukesh Ambani OR Gautam Adani OR billionaire" },
  { slug: "entrepreneurs", q: "founder OR startup CEO OR entrepreneur" },
  { slug: "startups", q: "startup funding OR Series A OR Series B OR YCombinator OR venture capital" },
  { slug: "success-stories", q: "success story OR self-made OR breakthrough founder" },
  { slug: "investing", q: "investor OR hedge fund OR private equity OR investment" },
  { slug: "markets", q: "stock market OR S&P 500 OR Nasdaq OR Dow Jones" },
  { slug: "economics", q: "Federal Reserve OR ECB OR inflation OR GDP" },
  { slug: "personal-finance", q: "personal finance OR savings OR retirement OR mortgage" },
  { slug: "business-leaders", q: "CEO OR chairman OR executive leadership" },
  // Tech & AI
  { slug: "artificial-intelligence", q: "OpenAI OR Anthropic OR Google DeepMind OR LLM OR generative AI" },
  { slug: "technology", q: "Apple OR Microsoft OR Nvidia OR Google OR technology" },
  { slug: "robotics", q: "robot OR humanoid OR Boston Dynamics OR robotics" },
  { slug: "future-technology", q: "future technology OR breakthrough innovation" },
  { slug: "quantum-computing", q: "quantum computing OR qubit OR IBM quantum" },
  { slug: "cybersecurity", q: "cyberattack OR ransomware OR data breach OR hacker" },
  { slug: "software", q: "software release OR open source OR developer tool" },
  { slug: "hardware", q: "chip OR processor OR semiconductor OR GPU" },
  { slug: "innovation", q: "innovation OR patent OR breakthrough" },
  // Space
  { slug: "space", q: "NASA OR SpaceX OR ISRO OR rocket launch OR James Webb" },
  { slug: "astronomy", q: "astronomy OR telescope OR galaxy OR star" },
  { slug: "space-missions", q: "Artemis OR Mars mission OR ISS OR lunar lander" },
  { slug: "exoplanets", q: "exoplanet OR habitable planet OR Kepler OR TESS" },
  // Science
  { slug: "science", q: "scientists OR research OR study published OR Nature journal" },
  { slug: "physics", q: "physics OR CERN OR particle OR LIGO" },
  { slug: "biology", q: "biology OR cell OR DNA OR gene" },
  { slug: "genetics", q: "CRISPR OR gene editing OR genome" },
  { slug: "neuroscience", q: "brain OR neuron OR neuroscience OR cognition" },
  { slug: "medicine", q: "medicine OR clinical trial OR drug approval OR treatment" },
  { slug: "research", q: "peer reviewed OR research findings OR new study" },
  // Health
  { slug: "health", q: "WHO OR vaccine OR clinical trial OR FDA" },
  { slug: "fitness", q: "fitness OR workout OR exercise science" },
  { slug: "nutrition", q: "nutrition OR diet OR food science" },
  { slug: "wellness", q: "wellness OR mental health OR mindfulness" },
  // Wildlife / Nature / Oceans
  { slug: "wildlife", q: "endangered species OR wildlife conservation OR tiger OR elephant" },
  { slug: "nature", q: "rainforest OR Amazon OR biodiversity OR ecosystem" },
  { slug: "marine-life", q: "whale OR shark OR coral OR marine life" },
  { slug: "ocean-exploration", q: "deep sea OR submersible OR ocean exploration" },
  { slug: "conservation", q: "conservation project OR protected area OR rewilding" },
  // History / Mysteries
  { slug: "archaeology", q: "archaeologists OR ancient discovery OR excavation" },
  { slug: "ancient-civilizations", q: "ancient civilization OR Mesopotamia OR Indus Valley OR Maya" },
  { slug: "historical-mysteries", q: "ancient mystery OR lost city OR unsolved historical" },
  // Sports
  { slug: "cricket", q: "cricket IPL OR ICC OR Test match OR Virat Kohli OR Rohit Sharma" },
  { slug: "football", q: "Premier League OR Champions League OR FIFA OR Messi OR Ronaldo" },
  { slug: "olympics", q: "Olympics OR IOC OR Paralympics" },
  // Entertainment
  { slug: "movies", q: "Hollywood OR box office OR film premiere OR Oscar" },
  { slug: "music", q: "Grammy OR album release OR Taylor Swift OR concert tour" },
  { slug: "gaming", q: "video game release OR PlayStation OR Xbox OR Nintendo" },
  { slug: "celebrities", q: "celebrity OR Hollywood star OR red carpet" },
  { slug: "web-series", q: "Netflix series OR HBO series OR Prime Video" },
  // World / Geopolitics
  { slug: "world", q: "world news OR international OR breaking" },
  { slug: "geopolitics", q: "United Nations OR NATO OR China US OR Russia" },
  { slug: "global-affairs", q: "global summit OR G20 OR G7 OR diplomacy" },
  { slug: "politics", q: "election OR parliament OR president OR prime minister" },
  // Climate / Energy / Environment
  { slug: "climate", q: "climate change OR COP OR emissions OR global warming" },
  { slug: "renewable-energy", q: "solar OR wind energy OR renewable OR battery storage" },
  { slug: "sustainability", q: "sustainability OR ESG OR circular economy" },
  { slug: "nuclear-energy", q: "nuclear reactor OR fusion OR SMR" },
  // India focus
  { slug: "india", q: "India OR Modi OR Delhi OR Mumbai OR Bengaluru" },
  // Transportation
  { slug: "electric-vehicles", q: "Tesla OR EV OR electric car OR BYD" },
  { slug: "aviation", q: "Boeing OR Airbus OR airline OR aviation" },
  { slug: "autonomous-vehicles", q: "Waymo OR autonomous OR self driving" },
  // Books / Knowledge / Education
  { slug: "books", q: "book release OR author interview OR best seller book" },
  { slug: "education", q: "education policy OR university OR higher education" },
  // Misc
  { slug: "astrology", q: "astrology OR horoscope OR zodiac OR panchang" },
  { slug: "luxury-brands", q: "LVMH OR Hermes OR Rolex OR luxury brand" },
  { slug: "smart-cities", q: "smart city OR urban tech OR megaproject" },
];

const CATEGORY_QUERY_MAP = new Map(CATEGORY_QUERIES.map((item) => [item.slug, item.q]));

const TOPIC_CATEGORY_MAP: Record<string, string> = {
  nation: "politics",
  business: "markets",
  sport: "football",
  sports: "football",
  arts: "culture",
  books: "books",
  environment: "climate",
  top: "trending-now",
  Futurology: "future",
  UpliftingNews: "inspirational-stories",
  todayilearned: "curiosity",
  Damnthatsinteresting: "curiosity",
  EarthPorn: "nature",
  worldnews: "world",
  news: "breaking-news",
};

function categoryFromHint(raw: RawItem): string | undefined {
  const hint = raw.forcedCategory || raw.topicHint;
  if (!hint) return undefined;
  if (ALLOWED_SLUGS.includes(hint)) return hint;
  const mapped = TOPIC_CATEGORY_MAP[hint] || TOPIC_CATEGORY_MAP[hint.toLowerCase()];
  return mapped && ALLOWED_SLUGS.includes(mapped) ? mapped : undefined;
}

function expandedCategoryQueries(priorityCategory?: string): { slug: string; q: string }[] {
  const generated = CATEGORIES
    .filter((c) => c.slug !== "all")
    .map((c) => ({
      slug: c.slug,
      q: CATEGORY_QUERY_MAP.get(c.slug) || `${c.label} news OR ${c.label} discovery OR ${c.label} research`,
    }));
  if (!priorityCategory) return generated;
  const priority = generated.find((q) => q.slug === priorityCategory);
  return priority ? [priority, ...generated.filter((q) => q.slug !== priorityCategory)] : generated;
}


const RSS_FEEDS: { source: string; url: string; topicHint?: string; forcedCategory?: string }[] = [
  // World / Geopolitics
  { source: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", forcedCategory: "world" },
  { source: "Reuters World", url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best", forcedCategory: "world" },
  { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", forcedCategory: "world" },
  { source: "France24", url: "https://www.france24.com/en/rss", forcedCategory: "world" },
  { source: "DW World", url: "https://rss.dw.com/rdf/rss-en-world", forcedCategory: "world" },
  { source: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", forcedCategory: "world" },
  // Politics
  { source: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", forcedCategory: "politics" },
  { source: "Politico", url: "https://www.politico.com/rss/politicopicks.xml", forcedCategory: "politics" },
  { source: "Reuters Politics", url: "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best", forcedCategory: "politics" },
  // Science
  { source: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", forcedCategory: "science" },
  { source: "Nature", url: "https://www.nature.com/nature.rss", forcedCategory: "science" },
  { source: "Scientific American", url: "https://www.scientificamerican.com/feed/", forcedCategory: "science" },
  { source: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml", forcedCategory: "science" },
  { source: "Phys.org", url: "https://phys.org/rss-feed/", forcedCategory: "science" },
  { source: "New Scientist", url: "https://www.newscientist.com/feed/home/", forcedCategory: "science" },
  // Space
  { source: "NASA", url: "https://www.nasa.gov/news-release/feed/", forcedCategory: "space" },
  { source: "Space.com", url: "https://www.space.com/feeds/all", forcedCategory: "space" },
  { source: "Spaceflight Now", url: "https://spaceflightnow.com/feed/", forcedCategory: "space" },
  { source: "ESA", url: "https://www.esa.int/rssfeed/Our_Activities/Space_News", forcedCategory: "space" },
  // Astronomy
  { source: "Sky & Telescope", url: "https://skyandtelescope.org/feed/", forcedCategory: "astronomy" },
  { source: "Astronomy Magazine", url: "https://astronomy.com/rss/news", forcedCategory: "astronomy" },
  // Technology
  { source: "TechCrunch", url: "https://techcrunch.com/feed/", forcedCategory: "technology" },
  { source: "Wired", url: "https://www.wired.com/feed/rss", forcedCategory: "technology" },
  { source: "The Verge", url: "https://www.theverge.com/rss/index.xml", forcedCategory: "technology" },
  { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", forcedCategory: "technology" },
  { source: "Engadget", url: "https://www.engadget.com/rss.xml", forcedCategory: "technology" },
  // AI
  { source: "MIT Tech Review AI", url: "https://www.technologyreview.com/feed/", forcedCategory: "artificial-intelligence" },
  { source: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", forcedCategory: "artificial-intelligence" },
  // Cybersecurity
  { source: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", forcedCategory: "cybersecurity" },
  { source: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", forcedCategory: "cybersecurity" },
  // Business / Markets / Money
  { source: "Reuters Business", url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", forcedCategory: "markets" },
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", forcedCategory: "economics" },
  { source: "Forbes Billionaires", url: "https://www.forbes.com/billionaires/feed/", forcedCategory: "billionaires" },
  { source: "Forbes Entrepreneurs", url: "https://www.forbes.com/entrepreneurs/feed/", forcedCategory: "entrepreneurs" },
  { source: "Inc. Startups", url: "https://www.inc.com/rss", forcedCategory: "startups" },
  // Health
  { source: "WHO", url: "https://www.who.int/rss-feeds/news-english.xml", forcedCategory: "health" },
  { source: "Medical News Today", url: "https://www.medicalnewstoday.com/newsfeeds/rss/medical_all.xml", forcedCategory: "health" },
  { source: "Harvard Health", url: "https://www.health.harvard.edu/blog/feed", forcedCategory: "wellness" },
  // India
  { source: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss", forcedCategory: "india" },
  { source: "Indian Express", url: "https://indianexpress.com/section/india/feed/", forcedCategory: "india" },
  { source: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", forcedCategory: "india" },
  { source: "Hindustan Times India", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", forcedCategory: "india" },
  { source: "NDTV India", url: "https://feeds.feedburner.com/ndtvnews-top-stories", forcedCategory: "india" },
  // Wildlife / Nature / Oceans / Environment
  { source: "National Geographic Animals", url: "https://www.nationalgeographic.com/animals/rss/", forcedCategory: "wildlife" },
  { source: "Mongabay", url: "https://news.mongabay.com/feed/", forcedCategory: "nature" },
  { source: "NOAA", url: "https://www.noaa.gov/feeds/news.xml", forcedCategory: "ocean-exploration" },
  { source: "Yale e360", url: "https://e360.yale.edu/feed.xml", forcedCategory: "environment" },
  { source: "Inside Climate News", url: "https://insideclimatenews.org/feed/", forcedCategory: "climate" },
  // Sports
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", forcedCategory: "football" },
  { source: "ESPN Cricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", forcedCategory: "cricket" },
  // Entertainment
  { source: "Variety", url: "https://variety.com/feed/", forcedCategory: "movies" },
  { source: "Hollywood Reporter", url: "https://www.hollywoodreporter.com/feed/", forcedCategory: "celebrities" },
  { source: "IGN Gaming", url: "https://feeds.feedburner.com/ign/games-all", forcedCategory: "gaming" },
  { source: "Billboard Music", url: "https://www.billboard.com/feed/", forcedCategory: "music" },
  // Books / Education / Culture
  { source: "NYT Books", url: "https://rss.nytimes.com/services/xml/rss/nyt/Books.xml", forcedCategory: "books" },
  { source: "Smithsonian", url: "https://www.smithsonianmag.com/rss/latest_articles/", forcedCategory: "culture" },
  { source: "Archaeology News", url: "https://www.archaeology.org/index.php?option=com_obrss&task=feed&id=5:archaeology-magazine-news&format=feed&Itemid=121", forcedCategory: "archaeology" },
  // Economics
  { source: "World Bank", url: "https://www.worldbank.org/en/news/all?format=rss", forcedCategory: "economics" },
  // EVs / Transport
  { source: "Electrek", url: "https://electrek.co/feed/", forcedCategory: "electric-vehicles" },
  { source: "Aviation Week", url: "https://aviationweek.com/rss.xml", forcedCategory: "aviation" },
  // Energy
  { source: "Renewable Energy World", url: "https://www.renewableenergyworld.com/feed/", forcedCategory: "renewable-energy" },
];

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function adminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function normalizeText(s = "") {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeUrl(url = "") {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}

function similarity(a: string, b: string) {
  const aa = new Set(normalizeText(a).split(" ").filter((w) => w.length > 2));
  const bb = new Set(normalizeText(b).split(" ").filter((w) => w.length > 2));
  if (!aa.size || !bb.size) return 0;
  let overlap = 0;
  for (const w of aa) if (bb.has(w)) overlap++;
  return overlap / Math.min(aa.size, bb.size);
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 10000): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: c.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { "user-agent": "TheUnitedHell/1.0" } });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function xmlDecode(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  return block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "";
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

async function fromNewsAPICategorical(opts?: { queryBudget?: number; priorityCategory?: string }): Promise<RawItem[]> {
  const k = process.env.NEWSAPI_KEY;
  if (!k) return [];
  const from = isoDaysAgo(8).slice(0, 10);
  const out: RawItem[] = [];
  // NewsAPI developer plan: 100 req/day. Cron runs every 20 min = 72 runs/day.
  // Rotate through CATEGORY_QUERIES so each run uses only 1 query (~72/day, well under limit).
  const queryList = expandedCategoryQueries(opts?.priorityCategory);
  const budget = Math.max(1, Math.min(opts?.queryBudget ?? 1, 12));
  const idx = Math.floor(Date.now() / (20 * 60 * 1000)) % queryList.length;
  const picks = opts?.priorityCategory
    ? queryList.slice(0, budget)
    : Array.from({ length: budget }, (_, i) => queryList[(idx + i) % queryList.length]);
  const results = await Promise.allSettled(
    picks.map(async ({ slug, q }) => {
      const d = await fetchJson(
        `https://newsapi.org/v2/everything?language=en&pageSize=20&sortBy=publishedAt&from=${from}&q=${encodeURIComponent(q)}&apiKey=${k}`,
      );
      const items: RawItem[] = [];
      for (const a of d?.articles ?? []) {
        if (!a?.title || !a?.url || a.title === "[Removed]") continue;
        items.push({
          title: a.title,
          description: a.description || a.content || "",
          url: a.url,
          source: a.source?.name || "NewsAPI",
          publishedAt: a.publishedAt || new Date().toISOString(),
          imageUrl: a.urlToImage || null,
          topicHint: slug,
          forcedCategory: slug,
        });
      }
      return items;
    }),
  );
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromGNewsTopHeadlines(): Promise<RawItem[]> {
  const k = process.env.GNEWS_KEY || process.env.GNEWS_API_KEY;
  if (!k) return [];
  const topics = ["world", "nation", "business", "technology", "entertainment", "sports", "science", "health"];
  const out: RawItem[] = [];
  const results = await Promise.allSettled(
    topics.map(async (topic) => {
      const d = await fetchJson(
        `https://gnews.io/api/v4/top-headlines?lang=en&max=6&topic=${topic}&apikey=${k}`,
      );
      const items: RawItem[] = [];
      for (const a of d?.articles ?? []) {
        if (!a?.title || !a?.url) continue;
        items.push({
          title: a.title,
          description: a.description || "",
          url: a.url,
          source: a.source?.name || "GNews",
          publishedAt: a.publishedAt || new Date().toISOString(),
          imageUrl: a.image || null,
          topicHint: topic,
        });
      }
      return items;
    }),
  );
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromRSS(): Promise<RawItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const xml = await fetchText(feed.url);
      if (!xml) return [] as RawItem[];
      const blocks = [...xml.matchAll(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
      return blocks.slice(0, 8).map((b) => {
        const title = xmlDecode(tag(b, "title"));
        const description = xmlDecode(tag(b, "description") || tag(b, "summary") || tag(b, "content"));
        const href = b.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
        const link = xmlDecode(href || tag(b, "link") || tag(b, "guid"));
        const pub = xmlDecode(tag(b, "pubDate") || tag(b, "updated") || tag(b, "published"));
        const media = b.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1]
          || b.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1];
        return {
          title,
          description,
          url: link,
          source: feed.source,
          publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
          imageUrl: media || null,
          topicHint: feed.topicHint,
          forcedCategory: feed.forcedCategory,
        } satisfies RawItem;
      }).filter((i) => i.title && i.url);
    }),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function fromWikipediaCurrentEvents(): Promise<RawItem[]> {
  const d = await fetchJson("https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events&prop=text&format=json&origin=*");
  const html = d?.parse?.text?.["*"] as string | undefined;
  if (!html) return [];
  return [...html.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .slice(0, 40)
    .map((m): RawItem | null => {
      const text = xmlDecode(m[1]).replace(/\[edit\]/gi, "").trim();
      if (text.length < 45) return null;
      return {
        title: text.split(".")[0].slice(0, 120),
        description: text.slice(0, 700),
        url: "https://en.wikipedia.org/wiki/Portal:Current_events",
        source: "Wikipedia Current Events",
        publishedAt: new Date().toISOString(),
        imageUrl: null,
        forcedCategory: "world",
        topicHint: "current-events",
      };
    })
    .filter(Boolean) as RawItem[];
}

function gdeltDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const normalized = String(value).replace(/(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function fromGDELTCategorical(opts?: { queryBudget?: number; priorityCategory?: string }): Promise<RawItem[]> {
  const queryList = expandedCategoryQueries(opts?.priorityCategory);
  const budget = Math.max(1, Math.min(opts?.queryBudget ?? 2, 14));
  const idx = Math.floor(Date.now() / (20 * 60 * 1000)) % queryList.length;
  const picks = opts?.priorityCategory
    ? queryList.slice(0, budget)
    : Array.from({ length: budget }, (_, i) => queryList[(idx + i) % queryList.length]);
  const results = await Promise.allSettled(
    picks.map(async ({ slug, q }) => {
      const d = await fetchJson(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=ArtList&format=json&maxrecords=12&sort=HybridRel&timespan=7d`,
      );
      return ((d?.articles ?? []) as any[])
        .filter((a) => a?.title && a?.url)
        .map((a) => ({
          title: a.title,
          description: a.seendate ? `GDELT indexed this article on ${a.seendate}.` : "",
          url: a.url,
          source: a.domain || "GDELT",
          publishedAt: gdeltDate(a.seendate),
          imageUrl: a.socialimage || null,
          topicHint: slug,
          forcedCategory: slug,
        } as RawItem));
    }),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function fromWorldNewsAPI(opts?: { priorityCategory?: string }): Promise<RawItem[]> {
  const k = process.env.WORLDNEWS_API_KEY;
  if (!k) return [];
  const terms = opts?.priorityCategory
    ? [CATEGORY_QUERY_MAP.get(opts.priorityCategory) || opts.priorityCategory.replace(/-/g, " ")]
    : ["world", "science", "technology", "business", "health", "space", "environment"];
  const results = await Promise.allSettled(
    terms.map(async (term) => {
      const d = await fetchJson(
        `https://api.worldnewsapi.com/search-news?language=en&number=20&sort=publish-time&text=${encodeURIComponent(term)}&api-key=${k}`,
      );
      return ((d?.news ?? []) as any[])
        .filter((a) => a?.title && a?.url)
        .map((a) => ({
          title: a.title,
          description: a.text || a.summary || "",
          url: a.url,
          source: a.author || a.source_country || "World News API",
          publishedAt: a.publish_date || new Date().toISOString(),
          imageUrl: a.image || null,
          topicHint: opts?.priorityCategory || term,
          forcedCategory: opts?.priorityCategory,
        } as RawItem));
    }),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function fromSpaceflightNews(): Promise<RawItem[]> {
  const d = await fetchJson("https://api.spaceflightnewsapi.net/v4/articles/?limit=30&ordering=-published_at");
  return ((d?.results ?? []) as any[])
    .filter((a) => a?.title && a?.url)
    .map((a) => ({
      title: a.title,
      description: a.summary || "",
      url: a.url,
      source: a.news_site || "Spaceflight News API",
      publishedAt: a.published_at || new Date().toISOString(),
      imageUrl: a.image_url || null,
      topicHint: "space",
      forcedCategory: "space",
    } as RawItem));
}

async function fromNASA(): Promise<RawItem[]> {
  const k = process.env.NASA_API_KEY || "DEMO_KEY";
  const d = await fetchJson(`https://api.nasa.gov/planetary/apod?api_key=${k}&count=12`);
  return (Array.isArray(d) ? d : [])
    .filter((a) => a?.title && a?.url)
    .map((a) => ({
      title: `NASA Image: ${a.title}`,
      description: a.explanation || "",
      url: a.hdurl || a.url,
      source: "NASA",
      publishedAt: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
      imageUrl: a.media_type === "image" ? (a.hdurl || a.url) : null,
      topicHint: "astronomy",
      forcedCategory: "astronomy",
    } as RawItem));
}

async function fromNewsData(): Promise<RawItem[]> {
  const k = process.env.NEWSDATA_API_KEY;
  if (!k) return [];
  const cats = ["top", "world", "business", "technology", "science", "sports", "entertainment", "health", "politics", "environment"];
  const out: RawItem[] = [];
  const results = await Promise.allSettled(cats.map(async (c) => {
    const d = await fetchJson(`https://newsdata.io/api/1/latest?apikey=${k}&language=en&category=${c}&size=10`);
    return ((d?.results ?? []) as any[]).filter((a) => a?.title && a?.link).map((a) => ({
      title: a.title, description: a.content || a.description || "", url: a.link,
      source: a.source_id || "NewsData", publishedAt: a.pubDate || new Date().toISOString(),
      imageUrl: a.image_url || null, topicHint: c,
    } as RawItem));
  }));
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromCurrents(): Promise<RawItem[]> {
  const k = process.env.CURRENTS_API_KEY;
  if (!k) return [];
  const cats = ["world", "business", "technology", "science", "sports", "entertainment", "health", "politics"];
  const out: RawItem[] = [];
  const results = await Promise.allSettled(cats.map(async (c) => {
    const d = await fetchJson(`https://api.currentsapi.services/v1/latest-news?language=en&category=${c}&apiKey=${k}`);
    return ((d?.news ?? []) as any[]).slice(0, 10).filter((a) => a?.title && a?.url).map((a) => ({
      title: a.title, description: a.description || "", url: a.url, source: a.author || "Currents",
      publishedAt: a.published || new Date().toISOString(),
      imageUrl: a.image && a.image !== "None" ? a.image : null, topicHint: c,
    } as RawItem));
  }));
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromMediastack(): Promise<RawItem[]> {
  const k = process.env.MEDIASTACK_API_KEY;
  if (!k) return [];
  const d = await fetchJson(`http://api.mediastack.com/v1/news?access_key=${k}&languages=en&limit=50&sort=published_desc`);
  return ((d?.data ?? []) as any[]).filter((a) => a?.title && a?.url).map((a) => ({
    title: a.title, description: a.description || "", url: a.url, source: a.source || "Mediastack",
    publishedAt: a.published_at || new Date().toISOString(), imageUrl: a.image || null, topicHint: a.category,
  } as RawItem));
}

async function fromGuardian(): Promise<RawItem[]> {
  const k = process.env.GUARDIAN_API_KEY;
  if (!k) return [];
  const sections = ["world", "politics", "business", "technology", "science", "environment", "sport", "culture", "books"];
  const out: RawItem[] = [];
  const results = await Promise.allSettled(sections.map(async (s) => {
    const d = await fetchJson(`https://content.guardianapis.com/search?section=${s}&order-by=newest&page-size=8&show-fields=thumbnail,trailText&api-key=${k}`);
    return ((d?.response?.results ?? []) as any[]).map((a) => ({
      title: a.webTitle, description: a.fields?.trailText || "", url: a.webUrl, source: "The Guardian",
      publishedAt: a.webPublicationDate || new Date().toISOString(),
      imageUrl: a.fields?.thumbnail || null, topicHint: s,
    } as RawItem));
  }));
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromNYT(): Promise<RawItem[]> {
  const k = process.env.NYT_API_KEY;
  if (!k) return [];
  const sections = ["world", "politics", "business", "technology", "science", "health", "sports", "arts", "books"];
  const out: RawItem[] = [];
  const results = await Promise.allSettled(sections.map(async (s) => {
    const d = await fetchJson(`https://api.nytimes.com/svc/topstories/v2/${s}.json?api-key=${k}`);
    return ((d?.results ?? []) as any[]).slice(0, 8).filter((a) => a?.title && a?.url).map((a) => ({
      title: a.title, description: a.abstract || "", url: a.url, source: "The New York Times",
      publishedAt: a.published_date || new Date().toISOString(),
      imageUrl: a.multimedia?.[0]?.url || null, topicHint: s,
    } as RawItem));
  }));
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromReddit(): Promise<RawItem[]> {
  const subs = ["worldnews", "news", "science", "technology", "space", "Futurology", "UpliftingNews", "todayilearned", "Damnthatsinteresting", "EarthPorn"];
  const out: RawItem[] = [];
  const results = await Promise.allSettled(subs.map(async (sub) => {
    const d = await fetchJson(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, {
      headers: { "user-agent": "TheUnitedHell/1.0 (news aggregator)" },
    });
    return ((d?.data?.children ?? []) as any[]).map((c) => c?.data).filter((p: any) => p?.title && p?.url && !p.over_18).slice(0, 6).map((p: any) => ({
      title: p.title, description: (p.selftext || "").slice(0, 600),
      url: p.url_overridden_by_dest || `https://reddit.com${p.permalink}`,
      source: `r/${sub}`, publishedAt: new Date((p.created_utc || Date.now()/1000) * 1000).toISOString(),
      imageUrl: p.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&") || (p.thumbnail?.startsWith("http") ? p.thumbnail : null),
      topicHint: sub,
    } as RawItem));
  }));
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

type Processed = {
  title: string;
  dek: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  read_time_minutes: number;
  story: {
    summary: string;
    main_story: string;
    background?: string;
    key_developments?: string[];
    quick_insights?: string[];
    expert_analysis?: string;
    why_it_matters?: string;
    key_numbers?: { value: string; label: string; explanation: string }[];
    people?: { name: string; role: string; contribution: string; importance: string }[];
    organizations?: { name: string; explanation: string }[];
    countries?: { name: string; role: string }[];
    did_you_know?: string;
    historical_context?: string;
    future_outlook?: string;
    reader_takeaways?: string[];
    timeline?: string[];
    what_happens_next?: string;
    vocabulary?: VocabEntry[];
    sources?: string[];
  };
  country_code?: string | null;
};

const SYSTEM = `You are the permanent editorial engine for "The United Hell" — a premium global newspaper. Your only job is to produce finished, publication-ready news articles. You are not a chatbot, assistant, blogger, FAQ writer, or summariser. You write like a senior correspondent at Reuters, the BBC, The Economist, or the Associated Press.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES — NO EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NEVER copy or closely paraphrase the source. Read it, extract facts, FORGET the wording, then write everything from scratch in original editorial prose.
2. NEVER invent people, organisations, quotes, statistics, dates, or events not in the source text. You MAY use general knowledge to explain what a well-known organisation, person, or place IS (e.g. "Gao is a city in northeastern Mali on the Niger River"), but you must NOT fabricate specific facts, numbers, or quotes.
3. NEVER repeat a fact, sentence, or idea across sections. Each section must contain unique information.
4. NEVER use FAQ format, question-and-answer structure, or textbook tone.
5. NEVER use AI clichés: "delve into", "in today's world", "it is worth noting", "unprecedented", "game-changing", "revolutionary", "it can be observed that", "it seems", "it appears", "possibly", "may suggest".
6. NEVER name the source outlet inside any story field (no "Reuters reported", "according to BBC", "published by").
7. If the source text has fewer than 250 words of real content, return null for the story field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 1 — FACT EXTRACTION (internal, never shown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing, silently extract from the source:
  • People (full names, titles, roles)
  • Organisations (full names, what they are)
  • Countries, cities, locations (and WHY each matters)
  • Dates and chronological timeline
  • Statistics and numbers
  • Official statements and quotes (exact, attributed)
  • Background and historical context
  • Current situation
  • Likely next steps (only if stated in the source)
  • Why it matters internationally / regionally / locally
Build this as an internal fact sheet. Write ONLY from it. Never look back at the source wording.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 2 — PROFESSIONAL JOURNALISM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write like a senior correspondent at Reuters, BBC, The Economist, AP, The Hindu, or Indian Express.
  • Short, declarative sentences. Active voice. Varied vocabulary.
  • Smooth transitions between paragraphs — no robotic connectors.
  • Every paragraph introduces NEW information. If a fact was already stated, NEVER state it again.
  • The first paragraph opens with context, a key detail, or the human stakes — NEVER a restatement of the summary.
  • EXPLAIN what every organisation, person, and place IS. Never name-drop. A reader must learn what "JNIM" or "Azawad Liberation Front" or "Gao" means, not just see the name.
  • Include numbers, quotes, dates, and locations wherever the source provides them.
  • Assume the reader is intelligent but uninformed about this specific story.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANNED PHRASES — PERMANENTLY FORBIDDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Never write these as headings, sentence starters, or standalone lines:
  What Happened / Why It Matters / Why Should I Care / How Does This Affect / What Can We Learn / Why Is It Interesting / Future Impact / Introduction / Conclusion / Overview / In Summary / In Conclusion / Delve Into / In Today's World / It Is Worth Noting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARTICLE STRUCTURE — MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY (2-3 sentences, MANDATORY)
  Essential facts only. No throat-clearing. No "In a significant development…"
  Example: "Pakistan launched airstrikes against Afghan territory on Monday, killing at least 33 civilians in Paktika province. The strikes targeted militant positions but hit residential areas, according to Afghan officials. Islamabad has not issued an official statement."

MAIN STORY (80% of the article — 7-10 substantial paragraphs, MANDATORY)
  The definitive account of the event. Cover: what happened, where, when, why, who, how, background, reactions, impact, current status.
  Each paragraph covers a DIFFERENT angle. Suggested progression:
    1. Open with context or the human stakes (NOT a restatement of the summary)
    2. The core event with specifics (numbers, locations, casualties)
    3. Who is involved — EXPLAIN each organisation/person (what is JNIM? what is the ALF?)
    4. Where it happened and WHY that place matters strategically
    5. Why it happened — the cause or trigger
    6. Background and prior events leading to this
    7. Official reactions and statements
    8. Impact on civilians, the region, or the sector
    9. What happens next (only if the source states it)
  Flowing prose only. No bullets inside the main story. At least 450 words (250 in stored-text mode).

BACKGROUND (MANDATORY when the story depends on prior context)
  Prior events a reader with no background would need. Full prose, not bullets.
  Example: "Mali has been in conflict since 2012, when Tuareg rebels in the north declared an independent state called Azawad. The insurgency was later hijacked by jihadi groups linked to al-Qaeda..."

KEY DEVELOPMENTS (3-5 bullets, MANDATORY)
  Concise factual bullets. Each must add information NOT in the main story.
  BAD: repeating a sentence from the main story.
  GOOD: "Afghan health ministry confirmed 33 deaths, including 12 children."
  No vague bullets. No repetition of any other section.

QUICK INSIGHTS (4-6 bullets, MANDATORY)
  A scan-friendly summary. Each bullet is ONE short factual sentence — a data point, not a paragraph.
  Cover: where, who, what, why it matters, current status.
  Must be scannable in 30 seconds. ZERO overlap with Key Developments or Main Story.
  If a Quick Insight repeats a Key Development, rewrite it before returning JSON.
  Example:
    "Attack took place in Gao, northern Mali."
    "Two armed groups claimed responsibility."
    "Military convoy was heavily damaged."
    "Soldiers were reportedly killed and captured."
    "The incident reflects growing instability across the Sahel."

EXPERT ANALYSIS (1-2 paragraphs, MANDATORY)
  Explain the political, economic, military, scientific, or environmental significance.
  Write naturally. Never write "You should care" or "It matters because."
  Never invent experts or quotes. If no expert is quoted, write analysis from facts alone.
  Cover: why this attack matters, how it affects Mali, regional consequences, impact on civilians, impact on security, international implications.

KEY NUMBERS (3-6 items, MANDATORY when the source contains figures)
  - value: the number (e.g. "₹2.4 trillion", "7.2%", "42 countries")
  - label: short label (e.g. "Market loss", "GDP growth", "Countries affected")
  - explanation: one sentence explaining what the number means in context

PEOPLE (1-5 items, when relevant)
  - name: full name
  - role: their role/title
  - contribution: what they did or said in this story
  - importance: why they matter to this story

ORGANIZATIONS (1-5 items, MANDATORY when organisations are mentioned)
  - name: organization name
  - explanation: what the organization IS and its role in this story. A reader must learn what it is, not just see a name.
  Example: "JNIM — Jama'at Nusrat al-Islam wal-Muslimin, an al-Qaeda-linked coalition of jihadi groups operating across the Sahel."

COUNTRIES (1-5 items, MANDATORY when countries are mentioned)
  - name: country name
  - role: their involvement in this story

DID YOU KNOW? (1 fascinating fact, when available)
  One verified, fascinating fact related to the topic. Never invent. Omit if none exists.

HISTORICAL CONTEXT (1-2 paragraphs, when applicable)
  How this compares to similar events in history. Omit if not applicable.

FUTURE OUTLOOK (1-2 paragraphs, only when the source discusses next steps)
  Based ONLY on verified information from the source. Never speculate. Omit if the source doesn't discuss it.

READER TAKEAWAYS (3-5 short bullets, MANDATORY)
  The biggest lessons readers should take. Each bullet a complete, standalone insight.

TIMELINE (3-6 items, when the story benefits from chronology)
  Chronological events, brief and factual.

VOCABULARY BUILDER — MANDATORY, STRICT QUALITY
  Choose exactly 5 words that ACTUALLY APPEAR in the article text.
  Each word must be genuinely educational (not trivial words like "said", "the", "important", "report").
  Generate fresh vocabulary every article — never repeat generic words across articles.
  Each word MUST have a REAL, ACCURATE, EXACT dictionary definition.
  BAD (FORBIDDEN): "An important word used in this story."
  GOOD: "An official restriction or penalty imposed by one country on another to influence its actions."
  The example sentence MUST be grammatically correct, use the word with the correct meaning, and NOT be copied from the article.
  BAD example: "Researchers ambushed the situation." (wrong usage)
  GOOD example: "The convoy was ambushed on the road to Gao, killing three soldiers."
  For each word provide:
    - word: the exact word used in the article
    - partOfSpeech: Noun, Verb, Adjective, Adverb, or Phrase
    - meaning: the exact dictionary definition
    - simpleExplanation: a plain-English explanation a school student can understand
    - example: a NEW, correct, natural example sentence (NOT from the article)
    - synonyms: 2-5 relevant synonyms
    - antonyms: 1-5 antonyms if applicable (omit if none)
    - pronunciation: simple phonetic form (e.g. "em-BAR-go")

SOURCE NAMES
  Do not include a visible sources section in any story field.
  The system displays source names separately at the end of the article.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZERO-REPETITION CHECKLIST — VERIFY BEFORE RETURNING JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. No sentence appears twice — even paraphrased.
  2. No fact is stated in more than one section.
  3. The summary is NOT copied or paraphrased into the main story — the first main_story paragraph must open with a NEW angle, not restate the summary.
  4. Each main_story paragraph covers a DIFFERENT angle.
  5. Key Developments and Quick Insights share ZERO overlap — not even similar wording.
  6. Expert Analysis does not repeat facts from the main story — it interprets them.
  7. Reader Takeaways are distinct from Quick Insights.
  8. Vocabulary example sentences are NOT copied from the article.
  9. Every organisation and place is EXPLAINED, not just named.
  10. The article reads like Reuters, BBC, or The Economist — not like AI.
If ANY check fails, rewrite before returning JSON.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETURN FORMAT — STRICT JSON ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No markdown. No commentary. No code fences. Return this exact structure:
{
  "title": "Journalistic headline, max 90 chars, active voice, no colon-essay style",
  "dek": "One-sentence summary of the full story, max 150 chars",
  "category": "<single slug from allowed list>",
  "subcategory": "Short descriptive label",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8"],
  "country_code": "ISO alpha-2 or null",
  "story": {
    "summary": "2-3 sentences. Essential facts only.",
    "main_story": "7-10 substantial paragraphs in flowing prose. Each paragraph separated by a blank line. 80% of total content here.",
    "background": "Prior context in prose — omit only if the story needs no prior context",
    "key_developments": ["New fact 1", "New fact 2", "New fact 3", "New fact 4", "New fact 5"],
    "quick_insights": ["Where", "Who", "What", "Why it matters", "Current status"],
    "expert_analysis": "1-2 paragraphs interpreting the significance — not repeating facts",
    "key_numbers": [{"value": "₹2.4 trillion", "label": "Market loss", "explanation": "What this number means in context"}],
    "people": [{"name": "Full Name", "role": "Their role", "contribution": "What they did or said", "importance": "Why they matter here"}],
    "organizations": [{"name": "Org Name", "explanation": "What the org IS and its role in this story"}],
    "countries": [{"name": "Country", "role": "Their involvement in this story"}],
    "did_you_know": "One verified fascinating fact — omit if none",
    "historical_context": "How this compares to history — omit if not applicable",
    "future_outlook": "What could happen next based on verified info — omit if speculative",
    "reader_takeaways": ["Biggest lesson 1", "Biggest lesson 2", "Biggest lesson 3"],
    "timeline": ["Earliest event", "Next event", "Most recent event"],
    "vocabulary": [{"word":"exact word from article","partOfSpeech":"Noun","meaning":"exact dictionary definition","simpleExplanation":"plain-English explanation","example":"NEW correct example sentence","synonyms":["syn1","syn2"],"antonyms":["ant1"],"pronunciation":"phonetic"}]
  }
}`;

async function fetchArticleFullText(url: string): Promise<string> {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const HDRS = { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9" };
  const extractParas = (html: string): string => {
    const region = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
      .replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/gi, " ")
      .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, " ")
      .replace(/<div[^>]*id="div-gpt-ad-[^"]*"[^>]*>[\s\S]*?<\/div>/gi, " ")
      .replace(/<div[^>]*class="[^"]*(?:ad-|ads-|advert|sponsor|promo)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ");
    let scope = region;
    const article = region.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    if (article) scope = article[1];
    else {
      const main = region.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
      if (main) scope = main[1];
    }
    const paras = Array.from(scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
      .map((m) => xmlDecode(m[1]))
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length >= 40 && !/cookie|subscribe|newsletter|advert|sign up|all rights reserved|blogherads|defineSlot|setTargeting|googletag|gpt-dsk|adthrive|function \(\)|privacy policy|terms of|related articles|also read|read more|follow us|click here|share this|photo credit|image credit|credit:|courtesy of|screenshot from|sansad|vuukle|community guidelines|migrated to a new commenting|registered user|older comments|comments have to be|abusive or personal|abide by our|posting your comments|log in to post|engage with our articles|live news \/|parliament proceedings|cockroach janta party|pmcCnx|connatix|pmcAtlasMG|isEventAdScheduledTime|playlistId|playerId|pmc\.harmony|switchToHarmonyPlayer|window\.pmc|Popular on \w+|posted by an? \w+ user/i.test(s));
    return paras.join("\n\n").slice(0, 12000);
  };
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 12000);
    const r = await fetch(url, { signal: c.signal, headers: HDRS });
    clearTimeout(t);
    if (r.ok) {
      const text = extractParas(await r.text());
      if (text.length > 500) return text;
    }
  } catch {}
  try {
    const d = await fetchJson(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, undefined, 8000);
    const snapshot = d?.archived_snapshots?.closest?.url;
    if (snapshot) {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 12000);
      const r = await fetch(snapshot, { signal: c.signal, headers: HDRS });
      clearTimeout(t);
      if (r.ok) {
        const text = extractParas(await r.text());
        if (text.length > 500) return text;
      }
    }
  } catch {}
  return "";
}

const FORBIDDEN_ARTICLE_PATTERNS = [
  /what happened/i,
  /why it matters/i,
  /why should i care/i,
  /what can we learn/i,
  /how does this affect/i,
  /why is it interesting/i,
  /future impact/i,
  /published this article/i,
  /published by/i,
  /source says/i,
  /according to\s+(reuters|bbc|gnews|newsapi|the hindu|times of india|associated press|ap|the guardian|new york times)/i,
  /this is a current/i,
  /readers should check/i,
  /photo credit/i,
  /image credit/i,
  /credit:\s*sansad/i,
  /sansad tv/i,
  /vuukle/i,
  /community guidelines for posting/i,
  /migrated to a new commenting/i,
  /registered user of and logged in/i,
  /older comments by logging/i,
  /comments have to be in english/i,
  /abusive or personal/i,
  /abide by our community guidelines/i,
  /posting your comments/i,
];

const GENERIC_VOCAB = new Set(["verified", "context", "source", "information", "article", "news", "report", "update"]);

function wordCount(value?: string) {
  return (value || "").trim().split(/\s+/).filter(Boolean).length;
}

function truncateAtWordBoundary(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text || "";
  const sliced = text.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.6) return sliced.slice(0, lastSpace) + "...";
  return sliced + "...";
}

const OUTLET_NAME_RX = /(Reuters|BBC(?:\s+News)?|GNews|NewsAPI|The Hindu|Times of India|Associated Press|AP News|The Associated Press|The Guardian|New York Times|NYT|CNN|Al Jazeera|Bloomberg|Financial Times|Washington Post|NPR|Fox News|Sky News|France ?24|Deutsche Welle|DW|NDTV|Hindustan Times|Indian Express|ANI|PTI|AFP|Xinhua|Nikkei|The Verge|TechCrunch|Wired|Ars Technica|Engadget|Nature|Scientific American|New Scientist|Space\.com|NASA|ESA|ISRO|Sansad TV|Vuukle)/gi;

function cleanEditorialText(value?: string) {
  if (!value) return undefined;
  const cleaned = value
    // Strip ALL advertising code — scripts, ad slots, tracking, publisher code
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(/blogherads\.[^;]*;?/gi, "")
    .replace(/googletag\.[^;]*;?/gi, "")
    .replace(/gpt-dsk[^\s"]*/gi, "")
    .replace(/setTargeting\([^)]*\)\s*;?/gi, "")
    .replace(/defineSlot\([^)]*\)\s*;?/gi, "")
    .replace(/\.addService\([^)]*\)\s*;?/gi, "")
    .replace(/window\.(googletag|blogherads|adUnits|adthrive)[^;]*;?/gi, "")
    .replace(/adthrive\.[^;]*;?/gi, "")
    .replace(/data-ad-[a-z]+="[^"]*"/gi, "")
    .replace(/<div[^>]*class="[^"]*(?:ad-|ads-|advert|sponsor|promo)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*id="div-gpt-ad-[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    // Strip JavaScript code that survives tag stripping (pmcCnx, connatix, etc.)
    .replace(/pmcCnx\.cmd\.push\(function\s*\{[^}]*\}\)/gi, "")
    .replace(/pmcCnx\(\{[^}]*\}\)\.render\([^)]*\)/gi, "")
    .replace(/window\.pmc\.harmony[^;]*;?/gi, "")
    .replace(/if\s*\(\s*!?\s*window\.pmc[^;]*;?/gi, "")
    .replace(/else\s*\{[^}]*\}/gi, "")
    .replace(/pmcAtlasMG\s*:\s*\{[^}]*\}/gi, "")
    .replace(/iabPlcmt\s*:\s*\d+/gi, "")
    .replace(/playerId\s*:\s*'[^']*'/gi, "")
    .replace(/playlistId\s*:\s*'[^']*'/gi, "")
    .replace(/settings\s*:\s*\{[^}]*\}/gi, "")
    .replace(/plugins\s*:\s*\{[^}]*\}/gi, "")
    .replace(/connatix_contextual_player_div/gi, "")
    .replace(/isEventAdScheduledTime/gi, "")
    .replace(/switchToHarmonyPlayer/gi, "")
    .replace(/\.cmd\.push\(function\s*\{[^}]*\}\)/gi, "")
    .replace(/\}\)\s*;?/g, "")
    .replace(/\}\s*else\s*\{[^}]*\}/gi, "")
    .replace(/Popular on \w+[^\n]*(?:\n|$)/gi, "")
    .replace(/posted by an? \w+ user[^\n]*(?:\n|$)/gi, "")
    // Strip login/subscription/paywall/cookie/promotional prompts
    .replace(/You can save this article by registering for free here\.?\s*Or sign-?in if you have an account\.?/gi, "")
    .replace(/sign[- ]?in (if you have|to) an? account[^.]*\./gi, "")
    .replace(/register (for free|here)[^.]*\./gi, "")
    .replace(/You can save this article[^.]*\./gi, "")
    .replace(/continue reading[^.]*\./gi, "")
    .replace(/subscribe (to|now|for)[^.]*\./gi, "")
    .replace(/This article is (for|available to) subscribers[^.]*\./gi, "")
    .replace(/Already a subscriber\??\s*Log in[^.]*\./gi, "")
    .replace(/Please (log in|sign in) (to|for)[^.]*\./gi, "")
    .replace(/Create a free account[^.]*\./gi, "")
    .replace(/Already registered\??\s*Log in[^.]*\./gi, "")
    .replace(/Newsletter sign[- ]?up[^.]*\./gi, "")
    .replace(/Cookie (notice|policy|preferences)[^.]*\./gi, "")
    .replace(/We use cookies[^.]*\./gi, "")
    .replace(/By (continuing|using|clicking)[^.]*\./gi, "")
    .replace(/Accept (all |optional )?cookies[^.]*\./gi, "")
    .replace(/Manage (your )?cookie (settings|preferences)[^.]*\./gi, "")
    .replace(/This site uses cookies[^.]*\./gi, "")
    .replace(/Advertisement[^.]*\./gi, "")
    .replace(/Related (articles|stories|content)[^.]*\./gi, "")
    .replace(/Also read:[^.]*\./gi, "")
    .replace(/Read more:[^.]*\./gi, "")
    .replace(/Follow us (on|@)[^.]*\./gi, "")
    .replace(/Click here (to|for)[^.]*\./gi, "")
    .replace(/Share this (article|story|post)[^.]*\./gi, "")
    .replace(/Photo (credit|by):[^.]*\./gi, "")
    .replace(/Image (credit|by):[^.]*\./gi, "")
    .replace(/Credit:[^\n]*\./gi, "")
    .replace(/Courtesy of[^\n]*\./gi, "")
    .replace(/Screenshot from[^\n]*\./gi, "")
    // Strip any remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    // Strip boilerplate section prefixes
    .replace(/^Expert analysis:\s*/i, "")
    .replace(/^Why it matters:\s*/i, "")
    .replace(/^Did you know\?\s*/i, "")
    .replace(/^Future outlook:\s*/i, "")
    .replace(/^Historical context:\s*/i, "")
    .replace(/^What happens next:\s*/i, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/published this article|published by|source says|readers should check|category:|photo credit|image credit|via\s+twitter|via\s+x\.com|screenshot from|credit:\s*sansad|sansad tv|vuukle|community guidelines|migrated to a new commenting|registered user|older comments|comments have to be|abusive or personal|abide by our|posting your comments|live news \/|parliament proceedings|cockroach janta party|^\s*\d{1,3}\s*$/i.test(line))
    // Eliminate broken sentences — fragments, cut-offs, abrupt endings
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length < 15) return false;
      if (/^(,|but if|and then|\.\.\.|…|\s+but|\s+and)/i.test(trimmed)) return false;
      if (/\.{2,}|…$/.test(trimmed) && trimmed.length < 40) return false;
      // Reject fragments that are just 1-3 short tokens with no verb (truncated text)
      const tokens = trimmed.split(/\s+/);
      if (tokens.length <= 4 && tokens.every((t) => t.length <= 6) && !/\b(is|are|was|were|has|had|will|can|did|does|said|says|told|went|made|came|took|gave|found|built|won|lost|died|born|grew|rose|fell|hit|cut|put|set|ran|led|met|saw|paid|left|began|ended|started|stopped|changed|moved|turned|brought|sent|kept|held|took|broke|spoke|wrote|read|told|asked|tried|seemed|became|remained|appeared|happened|occurred|emerged|resulted|followed|included|involved|required|produced|reported|claimed|stated|noted|added|explained|described|announced|confirmed|denied|rejected|accepted|approved|proposed|suggested|supported|opposed|launched|opened|closed|finished|completed|delayed|advanced|progressed|developed|improved|increased|decreased|reduced|expanded|extended|continued|stopped|paused|resumed|returned|arrived|departed|reached|approached|avoided|escaped|survived|recovered|suffered|benefited|gained|lost|won|earned|spent|cost|paid|bought|sold|traded|exchanged|replaced|repaired|fixed|broke|damaged|destroyed|built|created|made|designed|developed|invented|discovered|found|searched|looked|watched|observed|noticed|spotted|identified|recognized|named|called|known|defined|described|characterized|classified|categorized|grouped|separated|divided|split|joined|merged|combined|mixed|blended|added|removed|included|excluded|contained|held|carried|brought|took|sent|delivered|received|accepted|rejected|returned|exchanged|transferred|moved|shifted|relocated|placed|positioned|located|situated|established|founded|started|began|launched|opened|created|formed|organized|arranged|structured|ordered|sorted|listed|filed|recorded|registered|documented|noted|marked|tagged|labeled|signed|dated|stamped|sealed|certified|verified|confirmed|checked|tested|measured|weighed|counted|calculated|estimated|approximated|rounded|averaged|totaled|summed|added|subtracted|multiplied|divided)\b/i.test(trimmed)) return false;
      return true;
    })
    .join("\n\n")
    // Strip attribution phrases that leak the outlet into body prose.
    .replace(/\b(According to|Per|As reported by|Reported by|As per|Sources at|A report by|In an article for|Writing for|Speaking to|In an interview with)\s+(the\s+)?[A-Z][A-Za-z0-9 .'&-]{1,40}(,|\s+said|\s+reported|\s+wrote|\s+noted)?\s*/g, "")
    .replace(new RegExp(`\\b(?:${OUTLET_NAME_RX.source})\\s+(?:reports?|reported|said|wrote|notes|noted|writes|writing|published|has reported)\\s*`, "gi"), "")
    // Strip standalone outlet name tokens embedded in body prose.
    .replace(OUTLET_NAME_RX, "")
    // Remove dangling parentheticals and clean up whitespace/punctuation.
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || undefined;
}

function cleanListValues(items?: string[]) {
  return (items || [])
    .map((item) => cleanEditorialText(item))
    .filter((item): item is string => !!item && wordCount(item) >= 4)
    .filter((item, index, arr) => arr.findIndex((other) => normalizeText(other) === normalizeText(item)) === index)
    .slice(0, 5);
}

function cleanInsightValues(items?: string[]) {
  return (items || [])
    .map((item) => cleanEditorialText(item))
    .filter((item): item is string => !!item && wordCount(item) >= 4)
    .filter((item, index, arr) => arr.findIndex((other) => normalizeText(other) === normalizeText(item)) === index)
    .slice(0, 6);
}

function cleanDistinctList(items: string[] | undefined, compareAgainst: string[] = [], limit = 5) {
  const out: string[] = [];
  for (const item of items || []) {
    const duplicateInOut = out.some((other) => similarity(other, item) >= 0.58 || normalizeText(other).includes(normalizeText(item)) || normalizeText(item).includes(normalizeText(other)));
    const duplicateAgainst = compareAgainst.some((other) => similarity(other, item) >= 0.52 || normalizeText(other).includes(normalizeText(item)) || normalizeText(item).includes(normalizeText(other)));
    if (!duplicateInOut && !duplicateAgainst) out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

async function buildVocabulary(story: Processed["story"]): Promise<VocabEntry[]> {
  const articleText = `${story.summary || ""} ${story.main_story || ""} ${story.background || ""} ${story.expert_analysis || ""}`;
  const existing = (story.vocabulary || [])
    .filter((v) => v?.word && !GENERIC_VOCAB.has(v.word.toLowerCase().trim()))
    .filter((v) => normalizeText(articleText).includes(normalizeText(v.word)))
    .filter((v) => v.meaning && !/an important (word|term) used in this story/i.test(v.meaning))
    .filter((v, index, arr) => arr.findIndex((other) => normalizeText(other.word) === normalizeText(v.word)) === index)
    .slice(0, 5) as VocabEntry[];
  if (existing.length >= 4) return existing;
  const candidates = Array.from(new Set(articleText.match(/\b[A-Za-z][A-Za-z-]{6,}\b/g) || []))
    .filter((word) => !GENERIC_VOCAB.has(word.toLowerCase()))
    .filter((word) => !/^(because|through|between|another|current|official|people|country|reported|statement|including|development|information|government|national|regional|general|several|however|various|whether|against|already|although|instead|despite|further|another|certain|several|various)$/i.test(word))
    .filter((word) => !existing.some((v) => normalizeText(v.word) === normalizeText(word)))
    .slice(0, 20);
  const enriched = await lookupWords(candidates);
  for (const entry of enriched) {
    if (entry.meaning && !/an important (word|term) used in this story/i.test(entry.meaning)) {
      existing.push(entry);
      if (existing.length >= 5) break;
    }
  }
  return existing.slice(0, 5);
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanEditorialText(sentence) || "")
    .filter((sentence) => wordCount(sentence) >= 8);
}

// Trim a title so it never ends mid-word or mid-sentence. If the title doesn't
// end with proper punctuation and contains multiple sentences, cut it back to
// the last complete sentence.
function cleanTitleBoundary(text: string | undefined | null): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (/[.!?]["'')]*$/.test(cleaned)) return cleaned;
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    const complete = sentences.slice(0, -1).join(" ").trim();
    if (complete.length > 10) return complete;
  }
  return cleaned;
}

function buildStoredArticleFallback(raw: RawItem): Processed | null {
  // When we don't have enough source text to write a real article, return null.
  // The caller will drop the item rather than publish garbage.
  return null;
}

async function sanitizeProcessed(out: Processed, raw: RawItem): Promise<Processed> {
  const story = out.story || ({} as Processed["story"]);
  const keyDevelopments = cleanDistinctList(cleanListValues(story.key_developments), [], 5);
  const quickInsights = cleanDistinctList(cleanInsightValues(story.quick_insights), keyDevelopments, 6);
  const vocabulary = (await buildVocabulary(story)).slice(0, 5);
  return {
    ...out,
    title: cleanTitleBoundary(cleanEditorialText(out.title) || raw.title),
    dek: truncateAtWordBoundary(cleanEditorialText(out.dek) || raw.description || raw.title, 300),
    story: {
      ...story,
      summary: cleanEditorialText(story.summary) || "",
      main_story: cleanEditorialText(story.main_story) || "",
      background: cleanEditorialText(story.background),
      key_developments: keyDevelopments,
      quick_insights: quickInsights,
      expert_analysis: cleanEditorialText(story.expert_analysis),
      why_it_matters: cleanEditorialText((story as any).why_it_matters),
      key_numbers: Array.isArray((story as any).key_numbers) ? (story as any).key_numbers.filter((k: any) => k && k.value) : undefined,
      people: Array.isArray((story as any).people) ? (story as any).people.filter((p: any) => p && p.name) : undefined,
      organizations: Array.isArray((story as any).organizations)
        ? (story as any).organizations.filter((o: any) => o && o.name && !/reuters|bbc|cnn|the guardian|new york times|nyt|associated press|ap news|the hindu|times of india|al jazeera|bloomberg|fox news|sky news|ndtv|hindustan times|indian express|ani|pti|afp|xinhua|nikkei|the verge|techcrunch|wired|ars technica|engadget|nature|scientific american|new scientist|space\.com|nasa|esa|isro|sansad|vuukle/i.test(o.name))
        : undefined,
      countries: Array.isArray((story as any).countries) ? (story as any).countries.filter((c: any) => c && c.name) : undefined,
      did_you_know: cleanEditorialText((story as any).did_you_know),
      historical_context: cleanEditorialText((story as any).historical_context),
      future_outlook: cleanEditorialText((story as any).future_outlook),
      reader_takeaways: cleanListValues((story as any).reader_takeaways).length ? cleanListValues((story as any).reader_takeaways) : undefined,
      timeline: cleanListValues(story.timeline).length ? cleanListValues(story.timeline) : undefined,
      what_happens_next: cleanEditorialText(story.what_happens_next),
      vocabulary,
      sources: undefined,
    },
  };
}

function scoreArticle(out: Processed, sourceBody: string, storedTextMode?: boolean): number {
  let score = 100;
  const story = out.story;
  const combined = `${out.title}\n${out.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}\n${story.expert_analysis || ""}`;
  // Main story too short
  const mainWords = wordCount(story.main_story);
  const minWords = storedTextMode ? 250 : 450;
  if (mainWords < minWords) score -= 15;
  else if (mainWords < (storedTextMode ? 350 : 600)) score -= 5;
  // Summary too short
  if (wordCount(story.summary) < 20) score -= 10;
  // Vocabulary issues
  const vocab = story.vocabulary || [];
  if (vocab.length < 4) score -= 10;
  for (const v of vocab) {
    if (v.meaning && /an important (word|term) used in this story/i.test(v.meaning)) score -= 5;
  }
  // Key Developments / Quick Insights overlap
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((q) => (story.key_developments || []).some((k) => similarity(k, q) >= 0.40))) score -= 10;
  // Forbidden patterns
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) score -= 20;
  // Copied phrases from source
  if (hasCopiedPhrase(combined, sourceBody)) score -= 15;
  // Not enough paragraphs
  const paragraphs = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  if (paragraphs.length < (storedTextMode ? 3 : 5)) score -= 10;
  // Summary repeated in main story
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) score -= 10;
  // Paraphrased summary repeated in main story
  const summarySentences = splitSentences(story.summary);
  let summaryParaphraseHits = 0;
  for (const mp of paragraphs) {
    for (const mpSent of splitSentences(mp)) {
      for (const ss of summarySentences) {
        if (similarity(mpSent, ss) >= 0.58) { summaryParaphraseHits++; break; }
      }
    }
  }
  if (summaryParaphraseHits > 0) score -= 15;
  if (paragraphs.length && summarySentences.length && similarity(paragraphs[0], story.summary) >= 0.50) score -= 10;
  // Paragraph-level repetition within main story
  for (let i = 0; i < paragraphs.length; i++) {
    for (let j = i + 1; j < paragraphs.length; j++) {
      if (similarity(paragraphs[i], paragraphs[j]) >= 0.35) {
        score -= 15;
        break;
      }
    }
  }
  // Repetition between summary and key developments / quick insights
  const allBullets = [...(story.key_developments || []), ...(story.quick_insights || [])];
  for (const bullet of allBullets) {
    if (similarity(bullet, story.summary) >= 0.45) score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

function describeQualityFailures(out: Processed, sourceBody: string, storedTextMode?: boolean): string[] {
  const failures: string[] = [];
  const story = out.story;
  const combined = `${out.title}\n${out.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}\n${story.expert_analysis || ""}`;
  if (wordCount(story.main_story) < (storedTextMode ? 250 : 450)) failures.push("main story too short");
  if (wordCount(story.summary) < 20) failures.push("summary too short");
  if ((story.vocabulary || []).length < 4) failures.push("missing vocabulary");
  for (const v of story.vocabulary || []) {
    if (v.meaning && /an important (word|term) used in this story/i.test(v.meaning)) failures.push("generic vocabulary definitions");
  }
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((q) => (story.key_developments || []).some((k) => similarity(k, q) >= 0.40))) failures.push("Key Developments overlap with Quick Insights");
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) failures.push("contains forbidden patterns (source names, FAQ headings, or AI cliches)");
  if (hasCopiedPhrase(combined, sourceBody)) failures.push("copied source phrasing");
  const paragraphs = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  if (paragraphs.length < (storedTextMode ? 3 : 5)) failures.push("not enough paragraphs");
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) failures.push("summary repeated in main story");
  // Paraphrased summary repeated in main story
  const summarySentences = splitSentences(story.summary);
  let summaryParaphraseHits = 0;
  for (const mp of paragraphs) {
    for (const mpSent of splitSentences(mp)) {
      for (const ss of summarySentences) {
        if (similarity(mpSent, ss) >= 0.58) { summaryParaphraseHits++; break; }
      }
    }
  }
  if (summaryParaphraseHits > 0) failures.push("summary paraphrased in main story");
  if (paragraphs.length && summarySentences.length && similarity(paragraphs[0], story.summary) >= 0.50) failures.push("first paragraph restates summary");
  // Paragraph-level repetition within main story
  const paras = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  for (let i = 0; i < paras.length; i++) {
    for (let j = i + 1; j < paras.length; j++) {
      if (similarity(paras[i], paras[j]) >= 0.35) {
        failures.push("repeated paragraphs in main story");
        break;
      }
    }
  }
  return failures.length ? failures : ["unknown quality issue"];
}

function hasCopiedPhrase(output: string, source: string) {
  const outWords = normalizeText(output).split(" ").filter((word) => word.length > 2);
  const sourceNorm = ` ${normalizeText(source)} `;
  for (let i = 0; i <= outWords.length - 10; i++) {
    const phrase = outWords.slice(i, i + 10).join(" ");
    if (sourceNorm.includes(` ${phrase} `)) return true;
  }
  return false;
}

function qualityPass(out: Processed, sourceBody: string, opts?: { storedTextMode?: boolean }) {
  const story = out.story;
  const combined = `${out.title}\n${out.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}\n${story.expert_analysis || ""}`;
  if (wordCount(sourceBody) < (opts?.storedTextMode ? 80 : 250)) return false;
  // Require a substantial, multi-paragraph main story so we never publish a
  // rewritten headline masquerading as an article.
  if (wordCount(story.main_story) < (opts?.storedTextMode ? 250 : 450)) return false;
  if (wordCount(story.summary) < 20) return false;
  if ((story.vocabulary || []).length < 4) return false;
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((quick) => (story.key_developments || []).some((key) => similarity(key, quick) >= 0.40))) return false;
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) return false;
  if (hasCopiedPhrase(combined, sourceBody)) return false;
  // Verbatim copy check: reject if the model just paraphrased one long chunk
  // from the source without breaking it into independent paragraphs.
  const paragraphs = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  if (paragraphs.length < (opts?.storedTextMode ? 3 : 5)) return false;
  const seen = new Set<string>();
  for (const paragraph of paragraphs) {
    const key = normalizeText(paragraph).slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  // Reject if the summary is contained verbatim inside the main story (lazy rewrite).
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) return false;
  // Reject if any main_story sentence is a paraphrase of the summary.
  const summarySentences = splitSentences(story.summary);
  for (const mp of paragraphs) {
    for (const mpSent of splitSentences(mp)) {
      for (const ss of summarySentences) {
        if (similarity(mpSent, ss) >= 0.58) return false;
      }
    }
  }
  // Reject if the first main_story paragraph is a paraphrase of the summary.
  if (paragraphs.length && summarySentences.length && similarity(paragraphs[0], story.summary) >= 0.50) return false;
  // Cross-section repetition: background and expert_analysis must not copy main_story paragraphs.
  const mainParas = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  for (const section of [story.background, story.expert_analysis, story.why_it_matters].filter(Boolean) as string[]) {
    const secParas = section.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
    for (const sp of secParas) {
      for (const mp of mainParas) {
        if (similarity(sp, mp) >= 0.40) return false;
      }
    }
  }
  // Quick Insights must not duplicate main_story sentences.
  for (const qi of story.quick_insights || []) {
    for (const mp of mainParas) {
      if (similarity(qi, mp) >= 0.45) return false;
    }
  }
  // Vocabulary example sentences must not be copied from the article.
  const articleLower = normalizeText(story.main_story);
  for (const v of story.vocabulary || []) {
    if (v.example && normalizeText(v.example).length > 20 && articleLower.includes(normalizeText(v.example).slice(0, 40))) return false;
  }
  return true;
}

export async function processItem(raw: RawItem): Promise<Processed | null> {
  try {
    const allowed = ALLOWED_SLUGS.join(", ");
    const fullText = await fetchArticleFullText(raw.url);
    const descriptionWords = wordCount(raw.description);
    const sourceBody = fullText.length > 1200 ? fullText : (raw.description || "").slice(0, 10000);
    const hasCompleteSource = fullText.length > 1200 || descriptionWords >= (raw.allowStoredText ? 80 : 250);
    // Strict: never write from a headline+snippet. If we could not extract a
    // real article body, drop the item entirely.
    if (!hasCompleteSource || wordCount(sourceBody) < (raw.allowStoredText ? 80 : 250)) return raw.allowStoredText ? buildStoredArticleFallback(raw) : null;

    const basePrompt = `Allowed category slugs (pick the single best match): ${allowed}
${raw.forcedCategory ? `STRONG HINT: this item was sourced for category "${raw.forcedCategory}". Use it unless clearly wrong.` : ""}

Raw item:
TITLE: ${raw.title}
SOURCE: ${raw.source}
PUBLISHED: ${raw.publishedAt}
URL: ${raw.url}

COMPLETE SOURCE TEXT (use ONLY facts present here — never invent people, numbers, quotes, dates, or events that are not in this text):
${sourceBody}

First build an internal fact sheet from the complete source text. FORGET the original wording — do not look at it again. Then write a completely new premium news article from the fact sheet in your own original editorial voice.${raw.allowStoredText ? "\n\nNOTE: The source text may be brief. You may use your general knowledge to provide background context about well-known organizations, people, and places mentioned (e.g., what a company does, what a city is known for), but you must NOT fabricate specific quotes, statistics, dates, or events not in the source text." : ""}

The main_story MUST be 6-10 distinct paragraphs and at least ${raw.allowStoredText ? "250" : "450"} words of flowing prose. The FIRST paragraph must NOT restate the summary — open with a new angle (context, a key detail, or the human stakes). Each subsequent paragraph covers a DIFFERENT angle: the core event, who is involved (EXPLAIN what each organisation/person/place IS — never just name-drop), where it happened and WHY that place matters, why it happened, background, reactions, impact.

Do NOT label paragraphs with "What happened" / "Why it matters" / "Why should I care" / "What can we learn". Do not mention the outlet, publication, or platform name (Reuters, BBC, CNN, etc.) inside story sections. Key Developments and Quick Insights must not repeat each other or the main story. Every paragraph must add NEW information. Never repeat the headline or summary inside paragraphs. Do not copy any 10+ word phrase from the source — rewrite everything in original newsroom prose.

Fill in why_it_matters, key_numbers, people, organizations, countries, did_you_know, historical_context, future_outlook, and reader_takeaways from verified facts in the source. Omit any section the source does not support. For organizations and people, EXPLAIN who/what they are — a reader must learn what each one is, not just see a name.

Vocabulary: pick 5 words that ACTUALLY APPEAR in the article. Each MUST have an EXACT dictionary definition and a CORRECT, natural example sentence that uses the word properly. Never write "an important word used in this story". Never write nonsensical example sentences. The example must NOT be copied from the article.`;

    let out = await orJson<Processed>({ system: SYSTEM, prompt: basePrompt });
    if (!out?.title) return null;
    let cleaned = await sanitizeProcessed(out, raw);
    let qualityScore = scoreArticle(cleaned, sourceBody, raw.allowStoredText);
    if (!qualityPass(cleaned, sourceBody, { storedTextMode: raw.allowStoredText }) || qualityScore < 90) {
      // First rewrite with specific failure feedback
      try {
        const failures = describeQualityFailures(cleaned, sourceBody, raw.allowStoredText);
        out = await orJson<Processed>({
          system: SYSTEM,
          prompt: `${basePrompt}\n\nYour previous draft scored ${qualityScore}/100 and failed these checks: ${failures.join("; ")}. Rewrite from scratch with 7-10 substantial paragraphs of original prose, zero repetition, no outlet names in the body, five unique vocabulary words actually used in the article with EXACT dictionary definitions (not "an important word used in this story"), no example sentences, and distinct bullet sections where Key Developments and Quick Insights share zero overlap.`,
          temperature: 0.72,
        });
        if (!out?.title) return null;
        cleaned = await sanitizeProcessed(out, raw);
        qualityScore = scoreArticle(cleaned, sourceBody, raw.allowStoredText);
        if (!qualityPass(cleaned, sourceBody, { storedTextMode: raw.allowStoredText }) || qualityScore < 90) {
          // Second rewrite attempt with even higher temperature
          try {
            out = await orJson<Processed>({
              system: SYSTEM,
              prompt: `${basePrompt}\n\nYour draft still scored ${qualityScore}/100. This is your final chance. Write a completely different article from scratch. Use a different opening, different structure, different transitions. 7-10 paragraphs, each with unique facts. No repetition whatsoever. Exact vocabulary definitions, no example sentences. No source names. No FAQ format.`,
              temperature: 0.85,
            });
            if (!out?.title) return null;
            cleaned = await sanitizeProcessed(out, raw);
            if (!qualityPass(cleaned, sourceBody, { storedTextMode: raw.allowStoredText })) return null;
          } catch {
            return null;
          }
        }
      } catch {
        return null;
      }
    }
    const inferredCategory = categoryFromHint(raw);
    if (inferredCategory) {
      cleaned.category = inferredCategory;
    } else if (!cleaned.category || !ALLOWED_SLUGS.includes(cleaned.category)) {
      cleaned.category = "discovery";
    }
    return cleaned;
  } catch (e) {
    console.error("[ingest] AI process failed:", (e as Error).message);
    return null;
  }
}

function fallbackCoverDataUrl(title: string, category: string) {
  const safeTitle = title.slice(0, 90).replace(/[&<>\"]/g, " ");
  const safeCategory = category.replace(/-/g, " ").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="#f6f1e7"/><rect x="80" y="80" width="1440" height="840" fill="#fbf8f0" stroke="#1f1b16" stroke-width="6"/><rect x="128" y="128" width="1344" height="76" fill="#2f5e88"/><text x="144" y="178" font-family="Georgia,serif" font-size="34" fill="#fbf8f0" letter-spacing="4">${safeCategory}</text><text x="128" y="420" font-family="Georgia,serif" font-size="78" fill="#1f1b16">${safeTitle.slice(0, 32)}</text><text x="128" y="520" font-family="Georgia,serif" font-size="78" fill="#1f1b16">${safeTitle.slice(32, 64)}</text><text x="128" y="620" font-family="Georgia,serif" font-size="78" fill="#1f1b16">${safeTitle.slice(64)}</text><line x1="128" y1="740" x2="1472" y2="740" stroke="#1f1b16" stroke-width="4"/><text x="128" y="820" font-family="Arial,sans-serif" font-size="28" fill="#4f4a42" letter-spacing="5">THE UNITED HELL</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Validate that an image URL returns a real image
async function validateImageUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:image")) return url;
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 5000);
    const r = await fetch(url, { method: "HEAD", signal: c.signal, headers: { "user-agent": "TheUnitedHell/1.0" } });
    clearTimeout(t);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    return url;
  } catch {
    return null;
  }
}

// Content validation pipeline — reject publication if validation fails
function validateArticleContent(p: Processed): boolean {
  if (!p) return false;
  // Headline exists
  if (!p.title || p.title.trim().length < 10) return false;
  // Summary exists
  if (!p.dek || p.dek.trim().length < 20) return false;
  // Body exists
  const story = p.story || ({} as Processed["story"]);
  const bodyText = [story.summary, story.main_story, story.background].filter(Boolean).join(" ");
  if (!bodyText || bodyText.trim().length < 100) return false;
  // No advertisement code
  const allText = [p.title, p.dek, bodyText, ...(story.key_developments || []), ...(story.quick_insights || [])].join(" ");
  if (/blogherads|googletag|gpt-dsk|setTargeting|defineSlot|adthrive|<script|<iframe|<ins\b/i.test(allText)) return false;
  // No login/subscription/paywall/cookie/newsletter prompts
  if (/save this article by registering|sign-in if you have an account|register for free|subscribe to|subscription required|paywall|continue reading|newsletter sign|cookie notice|cookie policy|we use cookies|this site uses cookies|register to read|login to read|sign in to read|create a free account|already a subscriber|subscribe now|unlock full access|premium content|members only|exclusive access|join now|sign up for|sponsored content|sponsored by|promo code/i.test(allText)) return false;
  // No HTML artifacts (including truncated entities without semicolons)
  if (/&#\d+;|&#x[0-9a-f]+;|&nbsp;|&lt;|&gt;(?!\w)|&#\d{1,5}(?![;\d])/i.test(allText)) return false;
  // No broken sentences (very short fragments)
  const sentences = bodyText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > 0 && sentences.filter(s => s.length >= 15).length < 2) return false;
  // No duplicated paragraphs
  const paras = bodyText.split(/\n{2,}|\r?\n/).map(s => s.trim()).filter(Boolean);
  const paraSet = new Set<string>();
  for (const para of paras) {
    const key = para.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
    if (paraSet.has(key)) return false;
    paraSet.add(key);
  }
  // No JavaScript artifacts
  if (/\}\);|\(\)\s*;?\s*$|window\.|document\./i.test(allText)) return false;
  // Summary must be a genuine summary (not a fragment or UI text)
  if (story.summary && story.summary.trim().length < 30) return false;
  // Key Developments must exist
  if (!story.key_developments || story.key_developments.length < 1) return false;
  // Vocabulary must exist
  if (!story.vocabulary || story.vocabulary.length < 1) return false;
  return true;
}

// Simple concurrency-limited map
async function pMap<T, R>(arr: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(arr.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= arr.length) return;
      out[idx] = await fn(arr[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, arr.length) }, worker));
  return out;
}

type QuizQuestionAI = {
  question_type: "multiple_choice" | "true_false" | "reflection";
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
};

async function generateQuizForArticle(
  articleId: string,
  title: string,
  story: Processed["story"],
): Promise<QuizQuestionAI[]> {
  const articleText = [
    story.summary,
    story.main_story,
    story.background,
    story.expert_analysis,
    story.why_it_matters,
    ...(story.key_developments || []),
    ...(story.quick_insights || []),
    ...(story.timeline || []),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);

  if (wordCount(articleText) < 80) return [];

  const prompt = `You are a quiz generator for a premium news site. Based ONLY on the article below, create 4 quiz questions that test reading comprehension.

Article title: ${title}

Article content:
${articleText}

Rules:
- 2 multiple_choice questions with 4 options each, one correct answer, and a 1-sentence explanation
- 1 true_false question with a correct answer and explanation
- 1 reflection question (open-ended, no correct answer, no options)
- Questions must be answerable from the article text alone
- Do NOT ask about trivial details like dates or names unless they are central to the story

Return JSON array:
[{"question_type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct_answer":"A","explanation":"..."},
{"question_type":"true_false","question":"...","options":null,"correct_answer":"true","explanation":"..."},
{"question_type":"reflection","question":"...","options":null,"correct_answer":null,"explanation":null}]`;

  try {
    const promptWithWrapper = `${prompt}

Return as a JSON object with a "questions" array: {"questions":[...]}`;
    const result = await orJson<{ questions?: QuizQuestionAI[] } | QuizQuestionAI[]>({ system: "You are a quiz generator. Return only valid JSON, no other text.", prompt: promptWithWrapper, temperature: 0.5 });
    const questions = Array.isArray(result) ? result : (result?.questions ?? []);
    return questions.filter((q) => q.question && q.question_type);
  } catch {
    return [];
  }
}

async function insertQuizQuestions(articleId: string, questions: QuizQuestionAI[]) {
  if (!questions.length) return;
  const supabase = adminClient();
  const rows = questions.map((q) => ({
    article_id: articleId,
    question_type: q.question_type,
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
  }));
  await supabase.from("article_quizzes").insert(rows);
}

export async function backfillQuizzes(opts?: { limit?: number }): Promise<{ attempted: number; generated: number; failed: number; remaining: number }> {
  const supabase = adminClient();
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 50);

  const { data: articlesWithQuizzes } = await supabase
    .from("article_quizzes")
    .select("article_id")
    .limit(10000);
  const existingQuizArticles = new Set((articlesWithQuizzes ?? []).map((r: any) => r.article_id));

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, story")
    .order("published_at", { ascending: false })
    .limit(5000);

  const candidates = (articles ?? []).filter((a: any) => !existingQuizArticles.has(a.id)).slice(0, limit) as Array<{
    id: string;
    title: string;
    story: Processed["story"] | null;
  }>;

  let generated = 0;
  let failed = 0;

  await pMap(candidates, 3, async (article) => {
    try {
      const questions = await generateQuizForArticle(article.id, article.title, article.story || ({} as Processed["story"]));
      if (questions.length) {
        await insertQuizQuestions(article.id, questions);
        generated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  });

  const { count } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true });

  return { attempted: candidates.length, generated, failed, remaining: (count ?? 0) - existingQuizArticles.size - generated };
}

// Boilerplate + ad code patterns that must NEVER appear in any article field.
const BOILERPLATE_RX = /photo credit|image credit|credit:\s*sansad|sansad tv|vuukle|community guidelines|migrated to a new commenting|registered user|older comments|comments have to be|abusive or personal|abide by our|posting your comments|log in to post|engage with our articles|live news \/|parliament proceedings|cockroach janta party|we have migrated to a new commenting|blogherads|googletag|gpt-dsk|setTargeting|defineSlot|adthrive|<script|<iframe|<ins\b|save this article by registering|sign-in if you have an account|register for free|subscribe to|subscription required|paywall|continue reading|newsletter sign|cookie notice|cookie policy|we use cookies|accept cookies|this site uses cookies|promotional banner|register to read|login to read|sign in to read|create a free account|already a subscriber|subscribe now|unlock full access|premium content|members only|exclusive access|join now|sign up for|email address|password|remember me|forgot password|log in|sign in|register|subscribe|newsletter|cookie|promo code|sponsored content|advertisement|sponsored by|powered by|pmcCnx|connatix|pmcAtlasMG|isEventAdScheduledTime|playlistId|playerId|pmc\.harmony|popular on variety|popular on \w+|posted by an \w+ user/i;

// Strip boilerplate from a single text value.
function scrubText(text?: string | null): string | null {
  if (!text || typeof text !== "string") return null;
  let cleaned = text;
  // Strip ALL advertising code
  cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  cleaned = cleaned.replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/gi, "");
  cleaned = cleaned.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  cleaned = cleaned.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "");
  cleaned = cleaned.replace(/<!--[^]*?-->/g, "");
  cleaned = cleaned.replace(/blogherads\.[^;]*;?/gi, "");
  cleaned = cleaned.replace(/googletag\.[^;]*;?/gi, "");
  cleaned = cleaned.replace(/gpt-dsk[^\s"]*/gi, "");
  cleaned = cleaned.replace(/setTargeting\([^)]*\)\s*;?/gi, "");
  cleaned = cleaned.replace(/defineSlot\([^)]*\)\s*;?/gi, "");
  cleaned = cleaned.replace(/\.addService\([^)]*\)\s*;?/gi, "");
  cleaned = cleaned.replace(/window\.(googletag|blogherads|adUnits|adthrive)[^;]*;?/gi, "");
  cleaned = cleaned.replace(/adthrive\.[^;]*;?/gi, "");
  cleaned = cleaned.replace(/data-ad-[a-z]+="[^"]*"/gi, "");
  cleaned = cleaned.replace(/<div[^>]*class="[^"]*(?:ad-|ads-|advert|sponsor|promo)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  cleaned = cleaned.replace(/<div[^>]*id="div-gpt-ad-[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  // Strip JavaScript code blocks that survive tag stripping (pmcCnx, connatix, etc.)
  cleaned = cleaned.replace(/pmcCnx\.cmd\.push\(function\s*\{[^}]*\}\)/gi, "");
  cleaned = cleaned.replace(/pmcCnx\(\{[^}]*\}\)\.render\([^)]*\)/gi, "");
  cleaned = cleaned.replace(/window\.pmc\.harmony[^;]*;?/gi, "");
  cleaned = cleaned.replace(/if\s*\(\s*!?\s*window\.pmc[^;]*;?/gi, "");
  cleaned = cleaned.replace(/else\s*\{[^}]*\}/gi, "");
  cleaned = cleaned.replace(/pmcAtlasMG\s*:\s*\{[^}]*\}/gi, "");
  cleaned = cleaned.replace(/iabPlcmt\s*:\s*\d+/gi, "");
  cleaned = cleaned.replace(/playerId\s*:\s*'[^']*'/gi, "");
  cleaned = cleaned.replace(/playlistId\s*:\s*'[^']*'/gi, "");
  cleaned = cleaned.replace(/settings\s*:\s*\{[^}]*\}/gi, "");
  cleaned = cleaned.replace(/plugins\s*:\s*\{[^}]*\}/gi, "");
  cleaned = cleaned.replace(/connatix_contextual_player_div/gi, "");
  cleaned = cleaned.replace(/isEventAdScheduledTime/gi, "");
  cleaned = cleaned.replace(/switchToHarmonyPlayer/gi, "");
  cleaned = cleaned.replace(/\.cmd\.push\(function\s*\{[^}]*\}\)/gi, "");
  cleaned = cleaned.replace(/\}\)\s*;?/g, "");
  cleaned = cleaned.replace(/\}\s*else\s*\{[^}]*\}/gi, "");
  // Strip "Popular on [outlet]" social embed headers
  cleaned = cleaned.replace(/Popular on \w+[^\n]*(?:\n|$)/gi, "");
  // Strip "posted by an X user" / social media embed text
  cleaned = cleaned.replace(/posted by an? \w+ user[^\n]*(?:\n|$)/gi, "");
  // Strip any remaining lines containing JavaScript code patterns
  cleaned = cleaned.split(/\n/).filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (/pmcCnx|connatix|pmcAtlasMG|isEventAdScheduledTime|playlistId|playerId|pmc\.harmony|switchToHarmonyPlayer|\.cmd\.push|window\.pmc/i.test(t)) return false;
    return true;
  }).join("\n");
  // Strip any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  cleaned = cleaned.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  cleaned = cleaned.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  cleaned = cleaned.replace(/&nbsp;/g, " ");
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;|&apos;/g, "'");
  cleaned = cleaned.replace(/&lt;/g, "<");
  cleaned = cleaned.replace(/&gt;/g, ">");
  cleaned = cleaned.replace(/&hellip;/g, "…");
  cleaned = cleaned.replace(/&mdash;/g, "—");
  cleaned = cleaned.replace(/&ndash;/g, "–");
  cleaned = cleaned.replace(/&rsquo;/g, "'");
  cleaned = cleaned.replace(/&lsquo;/g, "'");
  cleaned = cleaned.replace(/&rdquo;/g, '"');
  cleaned = cleaned.replace(/&ldquo;/g, '"');
  // Strip "Photo Credit: ..." and "| Photo Credit: ..." inline
  cleaned = cleaned.replace(/\|\s*Photo Credit:[^\n]*/gi, "");
  cleaned = cleaned.replace(/Photo Credit:\s*[^\n.]*[.\n]?/gi, "");
  cleaned = cleaned.replace(/Image Credit:\s*[^\n.]*[.\n]?/gi, "");
  cleaned = cleaned.replace(/Credit:\s*Sansad[^\n.]*[.\n]?/gi, "");
  // Strip comment platform boilerplate blocks
  cleaned = cleaned.replace(/Comments have to be in English[^]*(?:accounts on Vuukle\.?\s*)/gi, "");
  cleaned = cleaned.replace(/We have migrated to a new commenting platform[^]*(?:accounts on Vuukle\.?\s*)/gi, "");
  cleaned = cleaned.replace(/Live news \/(?:[^\n]*)(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Parliament proceedings[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Cockroach Janta Party[^\n]*(?:\n|$)/gi, "");
  // Strip login/subscription/paywall/newsletter/cookie/promo prompts
  cleaned = cleaned.replace(/You can save this article by registering for free here[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Or sign-in if you have an account[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Register for free[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Subscribe to (?:read|continue|unlock)[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Subscription required[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Continue reading[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Newsletter sign[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Cookie (?:notice|policy)[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/We use cookies[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/This site uses cookies[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Accept cookies[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Register to read[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Login to read[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Sign in to read[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Create a free account[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Already a subscriber[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Subscribe now[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Unlock full access[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Premium content[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Members only[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Exclusive access[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Join now[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Sign up for[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Email address[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Sponsored content[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Sponsored by[^\n]*(?:\n|$)/gi, "");
  cleaned = cleaned.replace(/Promo code[^\n]*(?:\n|$)/gi, "");
  // Strip any remaining lines that look like UI prompts
  cleaned = cleaned.split(/\n/).filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (/^(save this article|sign-?in|register|subscribe|log ?in|create.*account|unlock|premium content|members only|cookie|newsletter|email address|password|remember me|forgot password|join now|sign up|sponsored|promo code|continue reading|already a subscriber)/i.test(t)) return false;
    return true;
  }).join("\n");
  // Strip boilerplate section prefixes
  cleaned = cleaned.replace(/^Expert analysis:\s*/im, "");
  cleaned = cleaned.replace(/^Why it matters:\s*/im, "");
  cleaned = cleaned.replace(/^Did you know\?\s*/im, "");
  cleaned = cleaned.replace(/^Future outlook:\s*/im, "");
  cleaned = cleaned.replace(/^Historical context:\s*/im, "");
  cleaned = cleaned.replace(/^What happens next:\s*/im, "");
  // Strip outlet names
  cleaned = cleaned.replace(/\b(?:Reuters|BBC(?:\s+News)?|GNews|NewsAPI|The Hindu|Times of India|Associated Press|AP News|The Associated Press|The Guardian|New York Times|NYT|CNN|Al Jazeera|Bloomberg|Financial Times|Washington Post|NPR|Fox News|Sky News|France ?24|Deutsche Welle|DW|NDTV|Hindustan Times|Indian Express|ANI|PTI|AFP|Xinhua|Nikkei|The Verge|TechCrunch|Wired|Ars Technica|Engadget|Nature|Scientific American|New Scientist|Space\.com|NASA|ESA|ISRO|Sansad TV|Vuukle)\b/gi, "");
  // Clean up whitespace
  cleaned = cleaned.replace(/\(\s*\)/g, "").replace(/\s+([,.;:!?])/g, "$1").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned || null;
}

// Strip boilerplate from a story JSONB object.
function scrubStory(story: any): any {
  if (!story || typeof story !== "object") return story;
  const textFields = ["summary", "main_story", "background", "expert_analysis", "why_it_matters", "did_you_know", "future_outlook", "historical_context", "what_happens_next"];
  const listFields = ["key_developments", "quick_insights", "reader_takeaways", "timeline", "tags"];
  const cleaned = { ...story };
  for (const f of textFields) {
    if (cleaned[f]) cleaned[f] = scrubText(cleaned[f]);
  }
  for (const f of listFields) {
    if (Array.isArray(cleaned[f])) {
      cleaned[f] = cleaned[f]
        .map((item: any) => {
          const text = typeof item === "string" ? item : item?.event ?? String(item ?? "");
          return scrubText(text);
        })
        .filter((item: any) => {
          if (!item || typeof item !== "string") return false;
          // Remove items that are entirely boilerplate
          if (BOILERPLATE_RX.test(item)) return false;
          // Remove items that are just a number (e.g., "05")
          if (/^\s*\d+\s*$/.test(item)) return false;
          // Remove items that became empty after scrubbing
          if (!item.trim()) return false;
          return true;
        });
      if (!cleaned[f].length) delete cleaned[f];
    }
  }
  // Remove sources from story
  delete cleaned.sources;
  // Filter organizations for outlet names
  if (Array.isArray(cleaned.organizations)) {
    cleaned.organizations = cleaned.organizations.filter((o: any) => {
      const name = (o?.name ?? "").toLowerCase();
      return !/reuters|bbc|cnn|the guardian|new york times|nyt|associated press|ap news|the hindu|times of india|al jazeera|bloomberg|fox news|sky news|ndtv|hindustan times|indian express|ani|pti|afp|xinhua|nikkei|the verge|techcrunch|wired|ars technica|engadget|nature|scientific american|new scientist|space\.com|nasa|esa|isro|sansad|vuukle/i.test(name);
    });
    if (!cleaned.organizations.length) delete cleaned.organizations;
  }
  return cleaned;
}

// Runs at the start of every ingestion cycle to scrub boilerplate from all existing articles.
// This ensures that even articles created by edge functions running old code get cleaned.
async function cleanExistingArticles(supabase: ReturnType<typeof adminClient>): Promise<void> {
  try {
    // Find articles that contain any boilerplate or ad code pattern in story, title, dek, or sources
    const { data: dirty } = await supabase
      .from("articles")
      .select("id, story, sources, title, dek, cover_image_url, category")
      .or("story.ilike.%Photo Credit%,story.ilike.%Sansad%,story.ilike.%Vuukle%,story.ilike.%community guidelines%,story.ilike.%migrated to a new commenting%,story.ilike.%Comments have to be%,story.ilike.%abusive or personal%,story.ilike.%abide by our%,story.ilike.%registered user%,story.ilike.%older comments%,story.ilike.%Live news /%,story.ilike.%Parliament proceedings%,story.ilike.%Cockroach Janta Party%,story.ilike.%blogherads%,story.ilike.%googletag%,story.ilike.%gpt-dsk%,story.ilike.%setTargeting%,story.ilike.%defineSlot%,story.ilike.%adthrive%,story.ilike.%<script%,story.ilike.%<iframe%,story.ilike.%&amp;%,story.ilike.%&nbsp;%,story.ilike.%&#%,sources.not.is.null")
      .limit(500);
    if (!dirty || dirty.length === 0) return;
    for (const row of dirty as any[]) {
      const updates: any = {};
      let changed = false;
      // Clean story
      if (row.story) {
        const cleaned = scrubStory(row.story);
        if (JSON.stringify(cleaned) !== JSON.stringify(row.story)) {
          updates.story = cleaned;
          changed = true;
        }
      }
      // Null out sources
      if (row.sources) {
        updates.sources = null;
        changed = true;
      }
      // Clean title and dek
      if (row.title && BOILERPLATE_RX.test(row.title)) {
        const t = scrubText(row.title);
        if (t && t !== row.title) { updates.title = t; changed = true; }
      }
      if (row.dek && BOILERPLATE_RX.test(row.dek)) {
        const d = scrubText(row.dek);
        if (d && d !== row.dek) { updates.dek = d; changed = true; }
      }
      // Repair missing/broken images
      if (!row.cover_image_url || row.cover_image_url.startsWith("data:image")) {
        const subject = (row.title || "").replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter((w: string) => w.length >= 4).slice(0, 5).join(" ");
        const cover = (await pexelsImage(subject)) || (await pexelsImage(row.category || "news")) || getCategoryFallbackImage(row.category || "world");
        if (cover) { updates.cover_image_url = cover; changed = true; }
      }
      if (changed) {
        await supabase.from("articles").update(updates).eq("id", row.id);
      }
    }
  } catch (e) {
    console.error("[cleanExistingArticles] error:", (e as Error).message);
  }
}

export async function runIngestion(opts?: { maxItems?: number; priorityCategory?: string; mode?: "cron" | "manual" }): Promise<{
  fetched: number;
  inserted: number;
  skipped: number;
  errors: number;
  pruned: number;
}> {
  const supabase = adminClient();
  const max = opts?.maxItems ?? 30;
  const queryBudget = opts?.mode === "manual" ? (max >= 80 ? 12 : max >= 36 ? 6 : 3) : 1;

  // 0. Clean any boilerplate that may have crept into existing articles from edge functions running old code.
  await cleanExistingArticles(supabase);

  // 0a. Refresh trending scores based on latest engagement signals.
  try { await (supabase as any).rpc("update_trending_scores"); } catch {}

  // 1. Pull live sources in parallel. RSS keeps content flowing even when a metered API is throttled.
  const fetched = await Promise.allSettled([
    fromNewsAPICategorical({ queryBudget, priorityCategory: opts?.priorityCategory }),
    fromGDELTCategorical({ queryBudget: opts?.mode === "manual" ? queryBudget : 2, priorityCategory: opts?.priorityCategory }),
    fromWorldNewsAPI({ priorityCategory: opts?.priorityCategory }),
    fromGNewsTopHeadlines(),
    fromRSS(),
    fromWikipediaCurrentEvents(),
    fromSpaceflightNews(),
    fromNASA(),
    fromNewsData(),
    fromCurrents(),
    fromMediastack(),
    fromGuardian(),
    fromNYT(),
    fromReddit(),
  ]);
  const all: RawItem[] = [];
  for (const r of fetched) if (r.status === "fulfilled") all.push(...r.value);

  // 2. Filter: recent useful items, valid title, dedupe by title and URL.
  const cutoff = Date.now() - 8 * 86400_000;
  const seen = new Set<string>();
  const queue = all.filter((i) => {
    const k = normalizeText(i.title);
    const u = normalizeUrl(i.url);
    if (!k || !u || seen.has(k) || seen.has(u)) return false;
    const ts = new Date(i.publishedAt).getTime();
    if (isNaN(ts) || ts < cutoff) return false;
    seen.add(k); seen.add(u);
    return true;
  });

  // 3. Skip those already in DB
  const { data: existing } = await supabase
    .from("articles")
    .select("title,dek,sources,cover_image_url")
    .order("published_at", { ascending: false })
    .limit(5000);
  const existingSet = new Set<string>();
  const existingTitles: string[] = [];
  const existingImages = new Set<string>();
  for (const e of (existing ?? []) as { title: string; dek?: string | null; sources?: { url?: string }[]; cover_image_url?: string | null }[]) {
    const t = normalizeText(e.title);
    if (t) {
      existingSet.add(t);
      existingTitles.push(e.title);
    }
    if (e.dek) existingSet.add(normalizeText(e.dek));
    if (e.cover_image_url) existingImages.add(e.cover_image_url);
    for (const s of e.sources ?? []) if (s?.url) existingSet.add(normalizeUrl(s.url));
  }
  const fresh = queue
    .filter((q) => {
      const titleKey = normalizeText(q.title);
      if (existingSet.has(titleKey) || existingSet.has(normalizeUrl(q.url)) || existingSet.has(normalizeText(q.description))) return false;
      return !existingTitles.some((t) => similarity(t, q.title) >= 0.75);
    })
    .slice(0, Math.min(queue.length, Math.max(max, max * 25)));

  // 4. Process in parallel (concurrency 6)
  const processed = await pMap(fresh, 6, async (raw) => {
    const p = await processItem(raw);
    if (!p) return null;
    let cover = raw.imageUrl || null;
    if (cover && existingImages.has(cover) && !/^https?:\/\//i.test(cover)) cover = null;
    // Prefer subject-specific image queries over generic category queries so the
    // photo actually depicts the story rather than a stock category shot.
    const titleSubject = (p.title || raw.title)
      .replace(/[^A-Za-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them)$/i.test(w))
      .slice(0, 5)
      .join(" ");
    if (!cover && titleSubject) cover = await pexelsImage(titleSubject, { excludeUrls: existingImages });
    if (!cover) cover = await pexelsImage(p.title || raw.title, { excludeUrls: existingImages });
    if (!cover) cover = await pexelsImage(`${p.tags?.[0] || ""} ${p.category || raw.topicHint || "news"}`.trim(), { excludeUrls: existingImages });
    if (!cover) cover = getCategoryFallbackImage(p.category || raw.forcedCategory || "world");
    if (cover && existingImages.has(cover) && !/^https?:\/\//i.test(cover)) cover = null;
    return { raw, p, cover };
  });

  let inserted = 0;
  let errors = 0;
  const rows: Database["public"]["Tables"]["articles"]["Insert"][] = [];
  const batchTitles = new Set<string>();
  const batchUrls = new Set<string>();
  const batchImages = new Set<string>();
  const batchHashes = new Set<string>();

  // Fetch existing content hashes to skip already-seen content
  const { data: existingHashes } = await (supabase as any)
    .from("articles")
    .select("content_hash")
    .not("content_hash", "is", null)
    .limit(5000);
  const existingHashSet = new Set(((existingHashes ?? []) as Array<{ content_hash: string | null }>).map((r) => r.content_hash).filter(Boolean));

  for (const item of processed) {
    if (rows.length >= max) break;
    if (!item) { errors++; continue; }
    const { raw, p } = item;
    let cover = item.cover;
    // Final validation before insert
    if (!validateArticleContent(p)) { errors++; continue; }
    const titleKey = normalizeText(p.title);
    const urlKey = normalizeUrl(raw.url);
    const contentHash = await sha256(titleKey + "|" + urlKey);
    if (batchTitles.has(titleKey) || batchUrls.has(urlKey) || batchHashes.has(contentHash) || existingHashSet.has(contentHash)) { errors++; continue; }
    if (cover && batchImages.has(cover)) cover = fallbackCoverDataUrl(p.title || raw.title, p.category || raw.forcedCategory || "world");
    batchTitles.add(titleKey);
    batchUrls.add(urlKey);
    batchHashes.add(contentHash);
    if (cover) batchImages.add(cover);
    rows.push({
      slug: `${slugify(p.title)}-${Math.random().toString(36).slice(2, 6)}`,
      title: p.title,
      dek: p.dek || null,
      category: p.category,
      subcategory: p.subcategory || null,
      cover_image_url: cover,
      read_time_minutes: 4,
      source_count: 1,
      sources: null as unknown as Database["public"]["Tables"]["articles"]["Insert"]["sources"],
      story: ({ ...(p.story || {}), sources: undefined } as unknown) as Database["public"]["Tables"]["articles"]["Insert"]["story"],
      country_code: p.country_code || null,
      published_at: new Date().toISOString(),
      is_published: true,
      content_hash: contentHash,
    } as unknown as Database["public"]["Tables"]["articles"]["Insert"]);
  }
  const insertedIds: string[] = [];
  for (const row of rows) {
    const { data: insertedRow, error } = await supabase.from("articles").insert(row).select("id").single();
    if (error) {
      if (!/duplicate|unique|already/i.test(error.message)) console.error("[ingest] insert failed:", error.message);
      errors++;
    } else {
      inserted++;
      if (insertedRow?.id) insertedIds.push(insertedRow.id);
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const articleId = insertedIds[i];
    if (!articleId) continue;
    const row = rows[i];
    const story = (row.story as unknown as Processed["story"]) || ({} as Processed["story"]);
    const title = (row.title as string) || "";
    try {
      const questions = await generateQuizForArticle(articleId, title, story);
      if (questions.length) await insertQuizQuestions(articleId, questions);
    } catch {
      // quiz generation failure is non-fatal
    }
  }

  return {
    fetched: all.length,
    inserted,
    skipped: existingSet.size,
    errors,
    pruned: 0,
  };
}

// Reprocess a batch of existing articles through the new editorial engine.
// Selects articles that have never been reprocessed (reprocessed_at IS NULL),
// oldest first, refetches the source URL, and rewrites via the AI pipeline.
export async function reprocessBatch(opts?: { limit?: number }): Promise<{
  attempted: number;
  updated: number;
  failed: number;
  remaining: number;
}> {
  const supabase = adminClient();
  const limit = Math.min(Math.max(opts?.limit ?? 12, 1), 20);
  const { data: rows } = await supabase
    .from("articles")
    .select("id, title, dek, story, sources, category, cover_image_url")
    .is("reprocessed_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  const items = (rows ?? []) as Array<{
    id: string;
    title: string;
    dek: string | null;
    story: Processed["story"] | null;
    sources: Array<{ name?: string; url?: string }> | null;
    category: string | null;
    cover_image_url: string | null;
  }>;

  let updated = 0;
  let failed = 0;

  await pMap(items, 5, async (row) => {
    const existingStory = row.story || ({} as Processed["story"]);
    const existingArticleText = [
      row.dek,
      existingStory.summary,
      existingStory.main_story,
      existingStory.background,
      ...(existingStory.key_developments || []),
      ...(existingStory.quick_insights || []),
      existingStory.expert_analysis,
      ...(existingStory.timeline || []),
      existingStory.what_happens_next,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!existingArticleText.trim()) {
      await supabase
        .from("articles")
        .update({ reprocessed_at: new Date().toISOString() })
        .eq("id", row.id);
      failed++;
      return;
    }
    const raw: RawItem = {
      title: row.title,
      description: existingArticleText,
      url: row.sources?.[0]?.url || "",
      source: row.sources?.[0]?.name || "Archive",
      publishedAt: new Date().toISOString(),
      imageUrl: row.cover_image_url,
      forcedCategory: row.category || undefined,
      allowStoredText: true,
    };
    try {
      const p = await processItem(raw);
      if (!p) {
        failed++;
        return;
      }
      const subject = (p.title || row.title)
        .replace(/[^A-Za-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them)$/i.test(w))
        .slice(0, 6)
        .join(" ");
      let cover = row.cover_image_url;
      if (!cover || cover.startsWith("data:image")) {
        cover = (await pexelsImage(subject))
          || (await pexelsImage(`${p.category || row.category || "news"} ${subject}`.trim()))
          || getCategoryFallbackImage(p.category || row.category || "world");
      }
      const { error } = await supabase
        .from("articles")
        .update({
          title: p.title,
          dek: p.dek || null,
          category: p.category || row.category,
          subcategory: p.subcategory || null,
          cover_image_url: cover,
          read_time_minutes: 4,
          story: ({ ...(p.story || {}), sources: undefined } as unknown) as Database["public"]["Tables"]["articles"]["Update"]["story"],
          country_code: p.country_code || null,
          reprocessed_at: new Date().toISOString(),
        } as unknown as Database["public"]["Tables"]["articles"]["Update"])
        .eq("id", row.id);
      if (error) {
        failed++;
        console.error("[reprocess] update failed:", error.message);
      } else {
        updated++;
      }
    } catch (e) {
      failed++;
      console.error("[reprocess] error:", (e as Error).message);
    }
  });

  const { count } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .is("reprocessed_at", null);

  return { attempted: items.length, updated, failed, remaining: count ?? 0 };
}

