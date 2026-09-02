// Server-only news ingestion + AI processing pipeline.
// Pulls REAL, RECENT news per category, processes with Qwen via OpenRouter,
// fetches Pexels cover when source lacks one, and inserts into `articles`.
// Concurrency parallelised so manual "Curate More" returns fast.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { orJson, pexelsImage } from "./openrouter.server";
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
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    timeline?: string[];
    what_happens_next?: string;
    vocabulary?: VocabEntry[];
    sources?: string[];
  };
  country_code?: string | null;
};

const SYSTEM = `You are the permanent editorial engine for "The United Hell" — a premium global newspaper. Your only job is to produce finished, publication-ready news articles. You are not a chatbot, assistant, blogger, FAQ writer, or summariser. You write like a senior correspondent at Reuters, the BBC, or The New York Times.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULE — NO EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are FORBIDDEN from writing a final article using only:
  • A headline
  • A description
  • An RSS summary
  • A meta description
  • A NewsAPI snippet
  • A GNews snippet
If the complete source text provided below contains fewer than 250 words of actual content, return null for the story field.
You must NEVER invent people, organisations, quotes, statistics, dates, or events that are not present in the supplied source text.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 1 — FACT COLLECTION (internal, never shown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing a single sentence, silently extract from the source text:
  People (full names, titles, roles)
  Organisations (full names, types)
  Countries, cities, locations
  Dates and timeline
  Statistics and numbers
  Official statements and quotes (exact, attributed)
  Background and historical context
  Current situation
  Likely next steps (only if stated in the source)
  Related events
Build this as an internal knowledge object. Write ONLY from it. Never directly rewrite source sentences.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 2 — PROFESSIONAL JOURNALISM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write like a professional journalist telling a story — not like an AI summarising content.
  • Every paragraph introduces NEW information.
  • No paragraph repeats another.
  • Key Developments and Quick Insights must be completely different from each other.
  • No sentence repeats the headline or summary.
  • No hype words ("unprecedented", "game-changing", "revolutionary") unless the source uses them.
  • No hedging phrases ("it seems", "it appears", "possibly", "may suggest").
  • No AI clichés ("delve into", "in today's world", "it is worth noting").
  • No academic tone ("it can be observed that").
  • No FAQ format. No question-and-answer sections.
  • Short, declarative sentences. Active voice. Professional vocabulary.
  • Assume the reader is intelligent but uninformed about this specific story.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANNED SECTION HEADINGS — PERMANENTLY FORBIDDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Never write these words as section headers, sentence starters, or standalone lines:
  What Happened / Why It Matters / Why Should I Care / How Does This Affect / What Can We Learn / Why Is It Interesting / Future Impact / Introduction / Conclusion / Overview / In Summary / In Conclusion
These are internal AI prompts. Readers must never see them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARTICLE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY (2-3 sentences)
  Tell the reader the essential event immediately. No throat-clearing. No "In a significant development…"
  Example: "Pakistan launched airstrikes against Afghan territory on Monday, killing at least 33 civilians in the Paktika province. The strikes targeted militant positions but hit residential areas, according to Afghan officials. Islamabad has not issued an official statement."

MAIN STORY (80% of the article — 6-10 substantial paragraphs)
  Explain the full event: who, what, where, when, why, how.
  Include numbers, official statements, attributed quotes, chronology, current status.
  Each paragraph must advance the story — new facts, new context, new angle.
  No bullet points inside the main story. Flowing prose only.
  Do not name the publication source inside the text.
  The main story must be at least 450 words unless the verified source facts make that impossible; if impossible, return null.

BACKGROUND (when the story requires prior context)
  Explain previous events a reader with no background would need to understand today's story.
  Do not skip this if the story depends on history.
  Write in full prose, not bullets.

KEY DEVELOPMENTS (max 5 bullets)
  Concise factual bullets. Each must add information NOT already in the main story.
  Example: "Afghan health ministry confirmed 33 deaths, including 12 children."
  No vague bullets. No repetition.

  QUICK INSIGHTS (max 5 bullets)
  Each bullet is ONE short factual sentence — a data point, not a paragraph.
  Cover: main issue, biggest new development, why it matters, current status, next confirmed step.
  Must be scannable in 30 seconds. No overlap with Key Developments or Main Story.
  If a Quick Insight repeats a Key Development, rewrite it before returning JSON.

EXPERT ANALYSIS (1-2 paragraphs, natural prose)
  Explain the scientific, political, economic, military, or environmental significance — whichever is relevant.
  Write naturally. Never write "You should care" or "It matters because."
  Never invent experts. If no expert is quoted in the source, write the analysis from facts alone.

TIMELINE (only when the story benefits from chronology)
  Chronological events, brief and factual. Omit if the story does not need it.

WHAT HAPPENS NEXT (only when supported by verified reporting)
  State confirmed next steps or expected developments from the source.
  Never speculate. Never invent. If the source does not say what happens next, omit this field.

VOCABULARY BUILDER — MANDATORY QUALITY RULES
  Choose exactly 5 words that ACTUALLY APPEAR in the article text.
  Each word must be genuinely educational (not trivial words like "said", "the", "important").
  Generate fresh vocabulary every article — never repeat generic words across articles.
  Each word MUST have a REAL, ACCURATE, SPECIFIC, EXACT dictionary definition — not a generic placeholder.
  BAD (FORBIDDEN): "An important word used in this story."
  GOOD: "An official restriction or penalty imposed by one country on another to influence its actions."
  For each word provide:
    - word: the exact word used in the article
    - partOfSpeech: Noun, Verb, Adjective, Adverb, or Phrase
    - meaning: the exact dictionary definition
    - simpleExplanation: a plain-English explanation a school student can understand
    - example: a NEW example sentence using the word (do NOT copy from the article)
    - synonyms: 2-5 relevant synonyms
    - antonyms: 1-5 antonyms if applicable (omit if none)
    - pronunciation: simple phonetic form if available (e.g. "em-BAR-go")

SOURCE NAMES
  Do not include a visible sources section in any story field.
  Do not put source names, URLs, "published by" sentences, or timestamps inside any story field.
  The system displays source names separately at the very end of the article.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUBLICATION INFORMATION — SHOW ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Publication date (auto-set by system — do not include in JSON)
  Category (from allowed list — include in JSON)
Do NOT include any trust score, confidence score, or verification score in the JSON.
Do NOT show or write source names, reading time, platform names, author names, publishing companies, or publication timestamps inside the story fields.
Do NOT include "Published by", "Reported by", "According to [outlet]" anywhere in the article body.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDITORIAL QUALITY CHECKLIST (internal — verify before returning JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Complete story — reader needs no other source
  ✓ Every paragraph adds new information — NO paragraph may repeat facts, sentences, or ideas from any other paragraph
  ✓ Zero repetition across sections — summary, main_story, background, expert_analysis must each contain unique content
  ✓ Key Developments and Quick Insights must share ZERO overlap — not even similar wording
  ✓ No AI tone, no FAQ format, no robotic phrasing
  ✓ No banned section headings
  ✓ Real people, real organisations, real numbers from the source
  ✓ Background included when needed
  ✓ No visible source names in story fields
  ✓ Vocabulary words must have EXACT dictionary definitions — never "an important word used in this story"
  ✓ Reads like an experienced newsroom journalist wrote it
If any check fails, rewrite before returning JSON.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPETITION RULES — ZERO TOLERANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. No sentence may appear twice in the article — even paraphrased.
  2. No fact may be stated in more than one section.
  3. The summary must NOT be copied into the main story.
  4. Each paragraph in main_story must cover a DIFFERENT angle: who, what, why, how, context, impact, reaction, next steps.
  5. If you catch yourself repeating a point, delete it and write something new.
  6. Key Developments = chronological facts. Quick Insights = analytical takeaways. They must never overlap.

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
    "summary": "2-3 sentences. Essential facts only. No throat-clearing.",
    "main_story": "5-9 substantial paragraphs in flowing prose. Each paragraph separated by a blank line. 80% of the total article content here.",
    "background": "Prior context in prose — omit field if not needed",
    "key_developments": ["New fact 1", "New fact 2", "New fact 3", "New fact 4", "New fact 5"],
    "quick_insights": ["Main issue", "Biggest new development", "Significance stated as fact", "Current confirmed status", "Next confirmed step"],
    "expert_analysis": "1-2 paragraphs of significance analysis in natural prose",
    "timeline": ["Earliest event", "Next event", "Most recent event"],
    "what_happens_next": "Only verified expected developments — omit if speculative",
    "vocabulary": [{"word":"exact word from article","partOfSpeech":"Noun","meaning":"exact dictionary definition","simpleExplanation":"plain-English explanation","example":"new example sentence","synonyms":["syn1","syn2"],"antonyms":["ant1"],"pronunciation":"phonetic"}]
  }
`;

async function fetchArticleFullText(url: string): Promise<string> {
  // Lightweight extraction: fetch the source page and pull readable text from
  // <article> / <main> / repeated <p> blocks. No deps, fails silently on errors
  // so the pipeline never stops on a single bad source.
  try {
    const html = await fetchText(url, 8000);
    if (!html) return "";
    let region = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ");
    const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    if (article) region = article[1];
    else {
      const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
      if (main) region = main[1];
    }
    const paras = Array.from(region.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
      .map((m) => xmlDecode(m[1]))
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length >= 40 && !/cookie|subscribe|newsletter|advert|sign up|all rights reserved|blogherads|defineSlot|setTargeting|function \(\)/i.test(s));
    const joined = paras.join("\n\n");
    return joined.slice(0, 12000);
  } catch {
    return "";
  }
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
];

const GENERIC_VOCAB = new Set(["verified", "context", "source", "information", "article", "news", "report", "update"]);

function wordCount(value?: string) {
  return (value || "").trim().split(/\s+/).filter(Boolean).length;
}

const OUTLET_NAME_RX = /(Reuters|BBC(?:\s+News)?|GNews|NewsAPI|The Hindu|Times of India|Associated Press|AP News|The Associated Press|The Guardian|New York Times|NYT|CNN|Al Jazeera|Bloomberg|Financial Times|Washington Post|NPR|Fox News|Sky News|France ?24|Deutsche Welle|DW|NDTV|Hindustan Times|Indian Express|ANI|PTI|AFP|Xinhua|Nikkei|The Verge|TechCrunch|Wired|Ars Technica|Engadget|Nature|Scientific American|New Scientist|Space\.com|NASA|ESA|ISRO)/gi;

function cleanEditorialText(value?: string) {
  if (!value) return undefined;
  const cleaned = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/published this article|published by|source says|readers should check|category:|photo credit|image credit|via\s+twitter|via\s+x\.com|screenshot from/i.test(line))
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
    title: cleanEditorialText(out.title) || raw.title,
    dek: (cleanEditorialText(out.dek) || raw.description || raw.title).slice(0, 170),
    story: {
      ...story,
      summary: cleanEditorialText(story.summary) || "",
      main_story: cleanEditorialText(story.main_story) || "",
      background: cleanEditorialText(story.background),
      key_developments: keyDevelopments,
      quick_insights: quickInsights,
      expert_analysis: cleanEditorialText(story.expert_analysis),
      timeline: cleanListValues(story.timeline).length ? cleanListValues(story.timeline) : undefined,
      what_happens_next: cleanEditorialText(story.what_happens_next),
      vocabulary,
      sources: undefined,
    },
  };
}

function scoreArticle(out: Processed, sourceBody: string): number {
  let score = 100;
  const story = out.story;
  const combined = `${out.title}\n${out.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}\n${story.expert_analysis || ""}`;
  // Main story too short
  const mainWords = wordCount(story.main_story);
  if (mainWords < 450) score -= 15;
  else if (mainWords < 600) score -= 5;
  // Summary too short
  if (wordCount(story.summary) < 20) score -= 10;
  // Vocabulary issues
  const vocab = story.vocabulary || [];
  if (vocab.length < 4) score -= 10;
  for (const v of vocab) {
    if (v.meaning && /an important (word|term) used in this story/i.test(v.meaning)) score -= 5;
  }
  // Key Developments / Quick Insights overlap
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((q) => (story.key_developments || []).some((k) => similarity(k, q) >= 0.52))) score -= 10;
  // Forbidden patterns
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) score -= 20;
  // Copied phrases from source
  if (hasCopiedPhrase(combined, sourceBody)) score -= 15;
  // Not enough paragraphs
  const paragraphs = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  if (paragraphs.length < 5) score -= 10;
  // Summary repeated in main story
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) score -= 10;
  // Paragraph-level repetition within main story
  for (let i = 0; i < paragraphs.length; i++) {
    for (let j = i + 1; j < paragraphs.length; j++) {
      if (similarity(paragraphs[i], paragraphs[j]) >= 0.45) {
        score -= 15;
        break;
      }
    }
  }
  // Repetition between summary and key developments / quick insights
  const allBullets = [...(story.key_developments || []), ...(story.quick_insights || [])];
  for (const bullet of allBullets) {
    if (similarity(bullet, story.summary) >= 0.55) score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

function describeQualityFailures(out: Processed, sourceBody: string, storedTextMode?: boolean): string[] {
  const failures: string[] = [];
  const story = out.story;
  const combined = `${out.title}\n${out.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}\n${story.expert_analysis || ""}`;
  if (wordCount(story.main_story) < (storedTextMode ? 320 : 450)) failures.push("main story too short");
  if (wordCount(story.summary) < 20) failures.push("summary too short");
  if ((story.vocabulary || []).length < 4) failures.push("missing vocabulary");
  for (const v of story.vocabulary || []) {
    if (v.meaning && /an important (word|term) used in this story/i.test(v.meaning)) failures.push("generic vocabulary definitions");
  }
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((q) => (story.key_developments || []).some((k) => similarity(k, q) >= 0.52))) failures.push("Key Developments overlap with Quick Insights");
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) failures.push("contains forbidden patterns (source names, FAQ headings, or AI cliches)");
  if (hasCopiedPhrase(combined, sourceBody)) failures.push("copied source phrasing");
  const paragraphs = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  if (paragraphs.length < (storedTextMode ? 4 : 5)) failures.push("not enough paragraphs");
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) failures.push("summary repeated in main story");
  // Paragraph-level repetition within main story
  const paras = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  for (let i = 0; i < paras.length; i++) {
    for (let j = i + 1; j < paras.length; j++) {
      if (similarity(paras[i], paras[j]) >= 0.45) {
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
  for (let i = 0; i <= outWords.length - 16; i++) {
    const phrase = outWords.slice(i, i + 16).join(" ");
    if (sourceNorm.includes(` ${phrase} `)) return true;
  }
  return false;
}

function qualityPass(out: Processed, sourceBody: string, opts?: { storedTextMode?: boolean }) {
  const story = out.story;
  const combined = `${out.title}\n${out.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}\n${story.expert_analysis || ""}`;
  if (wordCount(sourceBody) < (opts?.storedTextMode ? 140 : 250)) return false;
  // Require a substantial, multi-paragraph main story so we never publish a
  // rewritten headline masquerading as an article.
  if (wordCount(story.main_story) < (opts?.storedTextMode ? 320 : 450)) return false;
  if (wordCount(story.summary) < 20) return false;
  if ((story.vocabulary || []).length < 4) return false;
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((quick) => (story.key_developments || []).some((key) => similarity(key, quick) >= 0.52))) return false;
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) return false;
  if (hasCopiedPhrase(combined, sourceBody)) return false;
  // Verbatim copy check: reject if the model just paraphrased one long chunk
  // from the source without breaking it into independent paragraphs.
  const paragraphs = story.main_story.split(/\n{2,}/).filter((p) => wordCount(p) >= 30);
  if (paragraphs.length < (opts?.storedTextMode ? 4 : 5)) return false;
  const seen = new Set<string>();
  for (const paragraph of paragraphs) {
    const key = normalizeText(paragraph).slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  // Reject if the summary is contained verbatim inside the main story (lazy rewrite).
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) return false;
  return true;
}

export async function processItem(raw: RawItem): Promise<Processed | null> {
  try {
    const allowed = ALLOWED_SLUGS.join(", ");
    const fullText = await fetchArticleFullText(raw.url);
    const descriptionWords = wordCount(raw.description);
    const sourceBody = fullText.length > 1200 ? fullText : (raw.description || "").slice(0, 10000);
    const hasCompleteSource = fullText.length > 1200 || descriptionWords >= (raw.allowStoredText ? 140 : 250);
    // Strict: never write from a headline+snippet. If we could not extract a
    // real article body, drop the item entirely.
    if (!hasCompleteSource || wordCount(sourceBody) < (raw.allowStoredText ? 140 : 250)) return raw.allowStoredText ? buildStoredArticleFallback(raw) : null;

    const basePrompt = `Allowed category slugs (pick the single best match): ${allowed}
${raw.forcedCategory ? `STRONG HINT: this item was sourced for category "${raw.forcedCategory}". Use it unless clearly wrong.` : ""}

Raw item:
TITLE: ${raw.title}
SOURCE: ${raw.source}
PUBLISHED: ${raw.publishedAt}
URL: ${raw.url}

COMPLETE SOURCE TEXT (use ONLY facts present here — never invent people, numbers, quotes, dates, or events that are not in this text):
${sourceBody}

First build an internal fact sheet from the complete source text. Then write a complete premium news article based strictly on that fact sheet. The main_story MUST be 6-10 distinct paragraphs and at least ${raw.allowStoredText ? "320" : "450"} words of flowing prose, each adding new information. Do NOT label paragraphs with "What happened" / "Why it matters" / "Why should I care" / "What can we learn". Do not mention the outlet, publication, or platform name (Reuters, BBC, CNN, etc.) inside story sections. Key Developments and Quick Insights must not repeat each other. Every paragraph must add NEW information. Never repeat the headline or summary inside paragraphs. Do not copy any 12+ word phrase from the source — rewrite everything in original newsroom prose.`;

    let out = await orJson<Processed>({ system: SYSTEM, prompt: basePrompt });
    if (!out?.title) return null;
    let cleaned = await sanitizeProcessed(out, raw);
    let qualityScore = scoreArticle(cleaned, sourceBody);
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
        qualityScore = scoreArticle(cleaned, sourceBody);
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
    if (!cover && titleSubject) cover = await pexelsImage(titleSubject);
    if (!cover) cover = await pexelsImage(p.title || raw.title);
    if (!cover) cover = await pexelsImage(`${p.tags?.[0] || ""} ${p.category || raw.topicHint || "news"}`.trim());
    if (!cover) cover = fallbackCoverDataUrl(p.title || raw.title, p.category || raw.forcedCategory || "world");
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
      sources: [{ name: raw.source, url: raw.url }] as unknown as Database["public"]["Tables"]["articles"]["Insert"]["sources"],
      story: ({ ...(p.story || {}), sources: undefined } as unknown) as Database["public"]["Tables"]["articles"]["Insert"]["story"],
      country_code: p.country_code || null,
      published_at: new Date().toISOString(),
      is_published: true,
      content_hash: contentHash,
    } as unknown as Database["public"]["Tables"]["articles"]["Insert"]);
  }
  for (const row of rows) {
    const { error } = await supabase.from("articles").insert(row);
    if (error) {
      if (!/duplicate|unique|already/i.test(error.message)) console.error("[ingest] insert failed:", error.message);
      errors++;
    } else {
      inserted++;
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
  const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 20);
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

  await pMap(items, 3, async (row) => {
    const src = row.sources?.[0];
    if (!src?.url) {
      await supabase
        .from("articles")
        .update({ reprocessed_at: new Date().toISOString() })
        .eq("id", row.id);
      failed++;
      return;
    }
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
    const raw: RawItem = {
      title: row.title,
      description: existingArticleText,
      url: src.url,
      source: src.name || "Source",
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
          || fallbackCoverDataUrl(p.title || row.title, p.category || "world");
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

