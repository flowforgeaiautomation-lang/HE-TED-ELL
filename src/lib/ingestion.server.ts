// Server-only news ingestion + AI processing pipeline.
// Pulls REAL, RECENT news per category, processes with Qwen via OpenRouter,
// fetches Pexels cover when source lacks one, and inserts into `articles`.
// Concurrency parallelised so manual "Curate More" returns fast.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { orJson, pexelsImage, getCategoryFallbackImage, pexelsVideo } from "./openrouter.server";
import { CATEGORIES } from "./categories";
import { lookupWords } from "./dictionary.server";
import type { VocabEntry } from "./types";
import { getSupabaseUrl, getSupabasePublishableKey } from "./supabase-config";
import { fetchWeather, fetchCountry, getProviderRegistry } from "./enrichment-providers";

type RawItem = {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string | null;
  topicHint?: string;
  forcedCategory?: string;
  forcedCountryCode?: string;
  allowStoredText?: boolean;
};

const ALLOWED_SLUGS = CATEGORIES.filter((c) => c.slug !== "all").map((c) => c.slug);

// Sources known to inject promotional boilerplate or non-news content — permanently blocked
const BLOCKED_SOURCES = /^(konexio|konexio network|moneycontrol promo|goodreturns promo|financialexpress promo|zee business promo|et now promo)$/i;

// Promotional boilerplate patterns that indicate an article is NOT genuine news —
// these appear as footer text injected by content farms and PR syndicators
const PROMOTIONAL_BOILERPLATE = /konexio network helps our society|helps our society with the daily business|corporate interview,? article on market|article on market and general article|which help our readers|daily business news updates|sponsored content|promoted content|paid post|brand content|advertising feature|guest post|this article is sponsored|brought to you by|in partnership with|presented by/i;

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
  // Norway — Norwegian news sources (forced country code NO)
  { source: "NRK Nyheter", url: "https://www.nrk.no/norge/toppsaker.rss", forcedCategory: "world", forcedCountryCode: "NO" },
  { source: "NRK Utland", url: "https://www.nrk.no/utland/toppsaker.rss", forcedCategory: "world", forcedCountryCode: "NO" },
  { source: "NRK Sport", url: "https://www.nrk.no/sport/toppsaker.rss", forcedCategory: "football", forcedCountryCode: "NO" },
  { source: "NRK Kultur", url: "https://www.nrk.no/kultur/toppsaker.rss", forcedCategory: "culture", forcedCountryCode: "NO" },
  { source: "NRK Vitenskap", url: "https://www.nrk.no/vitenskap/toppsaker.rss", forcedCategory: "science", forcedCountryCode: "NO" },
  { source: "NRK Tech", url: "https://www.nrk.no/teknologi/toppsaker.rss", forcedCategory: "technology", forcedCountryCode: "NO" },
  { source: "NRK Økonomi", url: "https://www.nrk.no/okonomi/toppsaker.rss", forcedCategory: "economics", forcedCountryCode: "NO" },
  { source: "NRK Helse", url: "https://www.nrk.no/helse/toppsaker.rss", forcedCategory: "health", forcedCountryCode: "NO" },
  { source: "Aftenposten Nyheter", url: "https://www.aftenposten.no/rssfeed/?cat=1&section=default", forcedCategory: "world", forcedCountryCode: "NO" },
  { source: "Aftenposten Sport", url: "https://www.aftenposten.no/rssfeed/?cat=31&section=default", forcedCategory: "football", forcedCountryCode: "NO" },
  { source: "Aftenposten Økonomi", url: "https://www.aftenposten.no/rssfeed/?cat=33&section=default", forcedCategory: "economics", forcedCountryCode: "NO" },
  { source: "Aftenposten Kultur", url: "https://www.aftenposten.no/rssfeed/?cat=27&section=default", forcedCategory: "culture", forcedCountryCode: "NO" },
  { source: "VG Nyheter", url: "https://www.vg.no/rssfeed/?format=xml", forcedCategory: "world", forcedCountryCode: "NO" },
  { source: "VG Sport", url: "https://www.vg.no/rssfeed/?format=xml&category=31", forcedCategory: "football", forcedCountryCode: "NO" },
  { source: "Dagbladet Nyheter", url: "https://www.dagbladet.no/rss/nyheter/", forcedCategory: "world", forcedCountryCode: "NO" },
  { source: "Dagbladet Sport", url: "https://www.dagbladet.no/rss/sport/", forcedCategory: "football", forcedCountryCode: "NO" },
  { source: "DN Næringsliv", url: "https://www.dn.no/rssfeed/", forcedCategory: "markets", forcedCountryCode: "NO" },
  { source: "Klassekampen", url: "https://www.klassekampen.no/rss/nyheter", forcedCategory: "politics", forcedCountryCode: "NO" },
  { source: "Dagsavisen", url: "https://www.dagsavisen.no/rss/nyheter", forcedCategory: "world", forcedCountryCode: "NO" },
  { source: "The Local Norway", url: "https://feeds.feedburner.com/thelocalnorway", forcedCategory: "world", forcedCountryCode: "NO" },
  { source: "Norway Post", url: "https://www.norwaypost.no/feed/", forcedCategory: "world", forcedCountryCode: "NO" },
  // Additional World / Global News
  { source: "AP World", url: "https://feeds.apnews.com/apf-worldnews", forcedCategory: "world" },
  { source: "UN News", url: "https://news.un.org/feed/?lang=en", forcedCategory: "world" },
  { source: "Euronews", url: "https://www.euronews.com/rss?level=theme&name=world", forcedCategory: "world" },
  { source: "Sky News World", url: "https://feeds.skynews.com/feeds/rss/world_news.xml", forcedCategory: "world" },
  { source: "CNBC World", url: "https://www.cnbc.com/id/100725368/device/rss/rss.html", forcedCategory: "world" },
  // Additional Politics
  { source: "The Hill", url: "https://thehill.com/feed/", forcedCategory: "politics" },
  { source: "Reuters Politics", url: "https://feeds.reuters.com/Reuters/PoliticsNews", forcedCategory: "politics" },
  // Additional Technology
  { source: "CNET", url: "https://www.cnet.com/rss/news/", forcedCategory: "technology" },
  { source: "Gizmodo", url: "https://gizmodo.com/rss", forcedCategory: "technology" },
  { source: "BGR", url: "https://bgr.com/feed/", forcedCategory: "technology" },
  { source: "TNW", url: "https://thenextweb.com/feed", forcedCategory: "technology" },
  { source: "VentureBeat Tech", url: "https://venturebeat.com/feed/", forcedCategory: "technology" },
  // Additional AI
  { source: "AI News", url: "https://artificialintelligence-news.com/feed/", forcedCategory: "artificial-intelligence" },
  { source: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", forcedCategory: "artificial-intelligence" },
  { source: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", forcedCategory: "artificial-intelligence" },
  // Additional Science
  { source: "Science Magazine", url: "https://www.science.org/rss/news_current.xml", forcedCategory: "science" },
  { source: "Live Science", url: "https://www.livescience.com/feeds/all", forcedCategory: "science" },
  { source: "Quanta Magazine", url: "https://www.quantamagazine.org/feed/", forcedCategory: "science" },
  // Additional Space
  { source: "Universe Today", url: "https://www.universetoday.com/feed/", forcedCategory: "space" },
  { source: "Space News", url: "https://spacenews.com/feed/", forcedCategory: "space" },
  // Additional Health
  { source: "WebMD", url: "https://rssfeeds.webmd.com/rss/rss.aspx?RSSid=1001", forcedCategory: "health" },
  { source: "STAT News", url: "https://www.statnews.com/feed/", forcedCategory: "health" },
  // Additional Climate / Environment
  { source: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", forcedCategory: "climate" },
  { source: "Climate Home", url: "https://www.climatechangenews.com/feed/", forcedCategory: "climate" },
  // Additional Business / Markets
  { source: "CNBC Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", forcedCategory: "markets" },
  { source: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss", forcedCategory: "markets" },
  { source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", forcedCategory: "markets" },
  // Additional Sports
  { source: "BBC Football", url: "https://feeds.bbci.co.uk/sport/football/rss.xml", forcedCategory: "football" },
  { source: "Sky Sports", url: "https://www.skysports.com/rss/12040", forcedCategory: "football" },
  { source: "ESPN", url: "https://www.espn.com/espn/rss/news", forcedCategory: "football" },
  // Additional Entertainment
  { source: "Deadline", url: "https://deadline.com/feed/", forcedCategory: "movies" },
  { source: "The Wrap", url: "https://www.thewrap.com/feed/", forcedCategory: "celebrities" },
  { source: "TV Line", url: "https://tvline.com/feed/", forcedCategory: "entertainment" },
  // Additional India
  { source: "India Today", url: "https://www.indiatoday.in/rss/1206578", forcedCategory: "india" },
  { source: "NDTV Latest", url: "https://www.ndtv.com/rss/latest", forcedCategory: "india" },
  { source: "Economic Times India", url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms", forcedCategory: "economics" },
  // Additional Education
  { source: "EdTech Digest", url: "https://edtechdigest.com/feed/", forcedCategory: "education" },
  // Additional Energy
  { source: "Oil Price", url: "https://oilprice.com/rss/main.xml", forcedCategory: "energy" },
  { source: "Greentech Media", url: "https://www.greentechmedia.com/feed/", forcedCategory: "renewable-energy" },
];

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function adminClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabasePublishableKey();
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
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
          forcedCountryCode: feed.forcedCountryCode,
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

async function fromFinancialAPIs(): Promise<RawItem[]> {
  const out: RawItem[] = [];
  const now = new Date().toISOString();
  const finnhubKey = process.env.FINNHUB_API_KEY || "d9kccs1r01qq9sqfu130d9kccs1r01qq9sqfu13g";
  const fmpKey = process.env.FMP_API_KEY || "Gmej9XaScIABNc9kxCZ8aDO6g8zeVuJx";

  try {
    const movers = await fetchJson(`https://finnhub.io/api/v1/stock/market-news?category=general&token=${finnhubKey}`);
    if (Array.isArray(movers)) {
      for (const m of movers.slice(0, 15)) {
        if (!m?.headline || !m?.url) continue;
        out.push({
          title: m.headline, description: m.summary || "", url: m.url, source: "Finnhub",
          publishedAt: m.datetime ? new Date(m.datetime * 1000).toISOString() : now,
          imageUrl: m.image || null, topicHint: "markets", forcedCategory: "markets",
        } as RawItem);
      }
    }
  } catch {}

  try {
    const gainers = await fetchJson(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${fmpKey}`);
    if (Array.isArray(gainers)) {
      for (const g of gainers.slice(0, 8)) {
        if (!g?.symbol || !g?.name) continue;
        const changePct = parseFloat(g.changesPercentage) || 0;
        if (Math.abs(changePct) < 3) continue;
        const direction = changePct > 0 ? "surged" : "plunged";
        out.push({
          title: `${g.name} (${g.symbol}) ${direction} ${Math.abs(changePct).toFixed(1)}% as trading volumes spike`,
          description: `${g.name}, trading under the symbol ${g.symbol}, ${direction} ${Math.abs(changePct).toFixed(2)}% to ${parseFloat(g.price).toFixed(2)}. The stock was among the biggest market movers in today's session.`,
          url: `https://www.google.com/finance/quote/${g.symbol}`, source: "FMP Market Movers",
          publishedAt: now, imageUrl: null, topicHint: "markets", forcedCategory: "markets",
        } as RawItem);
      }
    }
  } catch {}

  try {
    const losers = await fetchJson(`https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${fmpKey}`);
    if (Array.isArray(losers)) {
      for (const l of losers.slice(0, 5)) {
        if (!l?.symbol || !l?.name) continue;
        const changePct = parseFloat(l.changesPercentage) || 0;
        if (Math.abs(changePct) < 4) continue;
        out.push({
          title: `${l.name} (${l.symbol}) drops ${Math.abs(changePct).toFixed(1)}% amid heavy selling pressure`,
          description: `${l.name}, listed as ${l.symbol}, fell ${Math.abs(changePct).toFixed(2)}% to ${parseFloat(l.price).toFixed(2)}.`,
          url: `https://www.google.com/finance/quote/${l.symbol}`, source: "FMP Market Movers",
          publishedAt: now, imageUrl: null, topicHint: "markets", forcedCategory: "markets",
        } as RawItem);
      }
    }
  } catch {}

  try {
    const cryptoNews = await fetchJson(`https://finnhub.io/api/v1/news/crypto?token=${finnhubKey}`);
    if (Array.isArray(cryptoNews)) {
      for (const c of cryptoNews.slice(0, 8)) {
        if (!c?.headline || !c?.url) continue;
        out.push({
          title: c.headline, description: c.summary || "", url: c.url, source: "Finnhub Crypto",
          publishedAt: c.datetime ? new Date(c.datetime * 1000).toISOString() : now,
          imageUrl: c.image || null, topicHint: "markets", forcedCategory: "markets",
        } as RawItem);
      }
    }
  } catch {}

  try {
    const forexNews = await fetchJson(`https://finnhub.io/api/v1/news/forex?token=${finnhubKey}`);
    if (Array.isArray(forexNews)) {
      for (const f of forexNews.slice(0, 5)) {
        if (!f?.headline || !f?.url) continue;
        out.push({
          title: f.headline, description: f.summary || "", url: f.url, source: "Finnhub Forex",
          publishedAt: f.datetime ? new Date(f.datetime * 1000).toISOString() : now,
          imageUrl: f.image || null, topicHint: "economics", forcedCategory: "economics",
        } as RawItem);
      }
    }
  } catch {}

  return out;
}

// ── No-key public APIs that generate article-worthy content ──

async function fromArXiv(): Promise<RawItem[]> {
  const out: RawItem[] = [];
  const cats = [
    { q: "cat:cs.AI", hint: "artificial-intelligence" },
    { q: "cat:cs.CL", hint: "artificial-intelligence" },
    { q: "cat:astro-ph", hint: "astronomy" },
    { q: "cat:physics", hint: "physics" },
    { q: "cat:q-bio", hint: "biology" },
    { q: "cat:cs.LG", hint: "technology" },
  ];
  const results = await Promise.allSettled(cats.map(async (c) => {
    const d = await fetchJson(`https://export.arxiv.org/api/query?search_query=${c.q}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending`);
    if (!d) return [];
    const entries: any[] = d?.feed?.entry ? (Array.isArray(d.feed.entry) ? d.feed.entry : [d.feed.entry]) : [];
    return entries.filter((e) => e?.title?.trim && e?.id).slice(0, 5).map((e) => ({
      title: (e.title as string).replace(/\s+/g, " ").trim(),
      description: (e.summary as string || "").replace(/\s+/g, " ").trim().slice(0, 800),
      url: e.id as string,
      source: "arXiv",
      publishedAt: e.published || new Date().toISOString(),
      imageUrl: null,
      topicHint: c.hint,
      forcedCategory: c.hint,
    } as RawItem));
  }));
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromWorldBankData(): Promise<RawItem[]> {
  const out: RawItem[] = [];
  const indicators = [
    { code: "SP.POP.TOTL", label: "population", cat: "economics" },
    { code: "NY.GDP.MKTP.CD", label: "GDP", cat: "economics" },
    { code: "EN.ATM.CO2E.PC", label: "CO2 emissions per capita", cat: "climate" },
    { code: "SL.UEM.TOTL.ZS", label: "unemployment rate", cat: "economics" },
    { code: "SP.DYN.LE00.IN", label: "life expectancy", cat: "health" },
  ];
  const results = await Promise.allSettled(indicators.map(async (ind) => {
    const d = await fetchJson(`https://api.worldbank.org/v2/country/all/indicator/${ind.code}?format=json&per_page=10&date=2023:2024&sort=desc`);
    if (!Array.isArray(d) || !d[1]) return [];
    return (d[1] as any[]).filter((r) => r?.value != null && r?.country?.value && r.country.value !== "World" && r.country.value !== "High income").slice(0, 4).map((r) => ({
      title: `${r.country.value} ${ind.label}: ${r.value.toLocaleString()} in ${r.date}`,
      description: `${r.country.value} recorded ${ind.label} of ${r.value} in ${r.date}, according to World Bank data.`,
      url: `https://data.worldbank.org/indicator/${ind.code}`,
      source: "World Bank",
      publishedAt: new Date().toISOString(),
      imageUrl: null,
      topicHint: ind.cat,
      forcedCategory: ind.cat,
    } as RawItem));
  }));
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

async function fromNASAAPOD(): Promise<RawItem[]> {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  try {
    const d = await fetchJson(`https://api.nasa.gov/planetary/apod?count=3&api_key=${key}`);
    if (!Array.isArray(d)) return [];
    return d.filter((a) => a?.title && a?.explanation).map((a) => ({
      title: a.title,
      description: a.explanation.slice(0, 800),
      url: a.url || `https://apod.nasa.gov/apod/`,
      source: "NASA",
      publishedAt: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
      imageUrl: a.hdurl || a.url || null,
      topicHint: "astronomy",
      forcedCategory: "astronomy",
    } as RawItem));
  } catch { return []; }
}

async function fromNASAEONET(): Promise<RawItem[]> {
  try {
    const d = await fetchJson("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10");
    if (!d?.events) return [];
    return (d.events as any[]).filter((e) => e?.title && e?.categories?.[0]?.title).slice(0, 6).map((e) => ({
      title: e.title,
      description: `Natural event detected: ${e.categories.map((c: any) => c.title).join(", ")}. ${e.geometry?.[0]?.date ? `Detected on ${e.geometry[0].date}.` : ""}`,
      url: e.sources?.[0]?.url || "https://eonet.gsfc.nasa.gov/",
      source: "NASA EONET",
      publishedAt: e.geometry?.[0]?.date || new Date().toISOString(),
      imageUrl: null,
      topicHint: "climate",
      forcedCategory: "climate",
    } as RawItem));
  } catch { return []; }
}

async function fromGBIFSpecies(): Promise<RawItem[]> {
  const out: RawItem[] = [];
  try {
    const d = await fetchJson("https://api.gbif.org/v1/occurrence/search?limit=12&hasCoordinate=true&mediaType=StillImage");
    if (!d?.results) return [];
    for (const r of (d.results as any[]).filter((s) => s?.species && s?.scientificName).slice(0, 8)) {
      out.push({
        title: `Species observation: ${r.species} recorded in ${r.country || "unknown location"}`,
        description: `A ${r.species} (${r.scientificName}) was observed and recorded in GBIF biodiversity data. ${r.eventDate ? `Observation date: ${r.eventDate}.` : ""} ${r.recordedBy ? `Recorded by ${r.recordedBy}.` : ""}`,
        url: `https://www.gbif.org/occurrence/${r.key}`,
        source: "GBIF",
        publishedAt: r.eventDate || new Date().toISOString(),
        imageUrl: r.media?.[0]?.identifier || null,
        topicHint: "wildlife",
        forcedCategory: "wildlife",
      } as RawItem);
    }
  } catch {}
  return out;
}

async function fromOBISMarine(): Promise<RawItem[]> {
  try {
    const d = await fetchJson("https://api.obis.org/v3/occurrence?limit=8&size=20");
    if (!d?.results) return [];
    return (d.results as any[]).filter((r) => r?.scientificName).slice(0, 5).map((r) => ({
      title: `Marine observation: ${r.scientificName} recorded in ${r.waterBody || r.country || "ocean data"}`,
      description: `Marine species ${r.scientificName} observed at coordinates ${r.decimalLatitude}, ${r.decimalLongitude}. ${r.eventDate ? `Date: ${r.eventDate}.` : ""} Source: OBIS (Ocean Biodiversity Information System).`,
      url: `https://www.obis.org/`,
      source: "OBIS",
      publishedAt: r.eventDate || new Date().toISOString(),
      imageUrl: null,
      topicHint: "marine-life",
      forcedCategory: "marine-life",
    } as RawItem));
  } catch { return []; }
}

async function fromCrossrefRecent(): Promise<RawItem[]> {
  const mailto = process.env.CROSSREF_MAILTO || "contact@theunitedhell.in";
  const out: RawItem[] = [];
  const filters = ["type:journal-article", "from-pub-date:2026-10-01"];
  try {
    const d = await fetchJson(`https://api.crossref.org/works?filter=${filters.join(",")}&rows=12&select=title,abstract,URL,published,container-title&mailto=${mailto}`);
    if (!d?.message?.items) return [];
    for (const item of (d.message.items as any[]).filter((i) => i?.title?.[0] && i?.URL).slice(0, 8)) {
      const abstract = (item.abstract || "").replace(/<[^>]+>/g, "").slice(0, 600);
      out.push({
        title: item.title[0],
        description: abstract || `Published in ${item["container-title"]?.[0] || "a scholarly journal"}.`,
        url: item.URL,
        source: "Crossref",
        publishedAt: item.published?.["date-parts"]?.[0]?.join("-") || new Date().toISOString(),
        imageUrl: null,
        topicHint: "research",
        forcedCategory: "research",
      } as RawItem);
    }
  } catch {}
  return out;
}

async function fromNASANeoWs(): Promise<RawItem[]> {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  try {
    const today = new Date().toISOString().slice(0, 10);
    const d = await fetchJson(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&api_key=${key}`);
    if (!d?.near_earth_objects) return [];
    const allNeos: any[] = [];
    for (const dateKey of Object.keys(d.near_earth_objects)) {
      for (const neo of d.near_earth_objects[dateKey]) {
        if (neo?.name && neo?.estimated_diameter) allNeos.push(neo);
      }
    }
    return allNeos.slice(0, 5).map((neo) => ({
      title: `Asteroid ${neo.name} passes Earth at ${neo.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second ? parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_second).toFixed(0) + " km/s" : "unknown speed"}`,
      description: `Near-Earth object ${neo.name}, estimated diameter ${neo.estimated_diameter?.meters?.estimated_diameter_min?.toFixed(0)}–${neo.estimated_diameter?.meters?.estimated_diameter_max?.toFixed(0)} meters, approaches Earth. ${neo.is_potentially_hazardous_asteroid ? "Classified as potentially hazardous." : "Not classified as hazardous."} Closest approach: ${neo.close_approach_data?.[0]?.miss_distance?.kilometers ? parseFloat(neo.close_approach_data[0].miss_distance.kilometers).toLocaleString() + " km" : "distance unknown"}.`,
      url: neo.nasa_jpl_url || "https://api.nasa.gov/",
      source: "NASA NeoWs",
      publishedAt: new Date().toISOString(),
      imageUrl: null,
      topicHint: "space",
      forcedCategory: "space",
    } as RawItem));
  } catch { return []; }
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
    what_happened?: string;
    how_it_happened?: string;
    who_and_where?: string;
    what_came_before?: string;
    key_facts?: string[];
    vocabulary?: VocabEntry[];
    sources?: string[];
  };
  country_code?: string | null;
  sourceBody?: string;
  coverImageUrl?: string | null;
};

const SYSTEM = `You are the permanent editorial engine for "The United Hell" — a premium global newspaper. Your only job is to produce finished, publication-ready news articles. You are not a chatbot, assistant, blogger, FAQ writer, or summariser. You write like a senior correspondent at Reuters, the BBC, The Economist, or the Associated Press.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PIPELINE — MANDATORY EXECUTION ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You MUST follow this pipeline in order. Do NOT skip any stage.

STAGE 0 — READ THE WHOLE NEWS FIRST
Before writing anything, read and process the COMPLETE source material provided to you.
Do NOT skim. Do NOT extract keywords and fill templates. Do NOT just read the headline and first paragraph.
You must understand:
  - What happened
  - Who or what is involved
  - Where and when it happened
  - Why it happened
  - How it happened
  - Important facts and evidence
  - Numbers and dates
  - Background and context
  - What is new about this
  - Significance
  - Consequences and implications
  - Relevant history
  - What remains uncertain
  - What may happen next
If the available information is insufficient to explain the story accurately, return null for the story field. Do NOT invent missing information. Do NOT publish a meaningless filler article.

STAGE 1 — FACT EXTRACTION (internal, never shown)
Silently extract from the source:
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

STAGE 2 — INDEPENDENT RECONSTRUCTION
FORGET the source wording entirely. Using ONLY your fact sheet, write a completely new article from scratch.
Do NOT follow the source article's paragraph order, headline structure, or sentence patterns.
Do NOT perform sentence-by-sentence paraphrasing.
Independently organize the facts and explain the story in a fresh editorial structure and clear language.
Every sentence you write must be substantially different in wording from any source sentence.

STAGE 3 — VALIDATE BEFORE RETURNING
Before returning JSON, verify:
  ✅ English headline (not source-language, not generic template)
  ✅ Original wording (no copied phrases from source)
  ✅ Complete story (not keyword-filled, not vague)
  ✅ Adequate depth (450+ words in main_story)
  ✅ No generic AI filler
  ✅ No source-copying
  ✅ Correct facts (no invented people, numbers, dates, quotes)
  ✅ Story-specific sections (not generic templates)
  ✅ Correct vocabulary (exact dictionary definitions, correct contextual meaning)
If ANY check fails, rewrite from scratch before returning JSON.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES — NO EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NEVER copy or closely paraphrase the source. Read it, extract facts, FORGET the wording, then write everything from scratch in original editorial prose.
2. NEVER invent people, organisations, quotes, statistics, dates, or events not in the source text. You MAY use general knowledge to explain what a well-known organisation, person, or place IS (e.g. "Gao is a city in northeastern Mali on the Niger River"), but you must NOT fabricate specific facts, numbers, or quotes.
3. NEVER repeat a fact, sentence, or idea across sections. Each section must contain unique information.
4. NEVER use AI clichés: "delve into", "in today's world", "it is worth noting", "unprecedented", "game-changing", "revolutionary", "it can be observed that", "it seems", "it appears", "possibly", "may suggest", "a story reported by", "the reporting provides a window into", "this story matters because it illuminates", "the reporting highlights", "track X as this story develops", "the story connects to broader themes", "involving X and Y, this story is drawing attention", "moreover", "consequently", "in turn", "touching on X, Y, and Z", "this world story is drawing attention", "Reading Between the Lines on", "Multikunstneren: Unpacking the Details". If you catch yourself writing ANY phrase that could appear in any unrelated article without changing its meaning, STOP and write specific journalistic prose instead.
5. NEVER name the source outlet inside any story field (no "Reuters reported", "according to BBC", "published by").
6. NEVER use generic AI filler such as: "this information provides context", "this is interesting because", "readers can learn", "from the available article information", "the source information indicates", "this item was categorized", "this article provides", "it is important because it is important", "readers should check the source", "provides context about the event", "the information provides context", "check the source for future", "according to available article information". These are FORBIDDEN. If you catch yourself writing anything like these, STOP and write real journalistic prose instead.
7. NEVER generate generic template headlines like: "A Closer Look at the Story", "Understanding X: What the Latest Reporting Reveals", "Inside the X Story: Context, Players, and Implications", "The Story Behind the X Headlines". Every headline must be specific, attractive, informative, and story-specific.
8. If the source text has fewer than 250 words of real content, return null for the story field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL QUALITY STANDARD — TEST EVERY ARTICLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before returning JSON, ask yourself:
"If the source article disappeared from the internet, would this article still clearly read like an independently written The United Hell article?"
If NO → rewrite from scratch.
If YES → publish.
The final article MUST be: FACTUALLY FAITHFUL + GENUINELY ORIGINAL + INFORMATIVE + CLEAR + USEFUL + DISTINCTLY THE UNITED HELL.
Do NOT change formatting or headings to disguise copied text. Rewrite the ACTUAL CONTENT from scratch.

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
QUESTION-LED HEADINGS — THE SIGNATURE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The United Hell uses QUESTION-LED HEADINGS as its signature editorial style.
Each major section of the article must be introduced by a genuine question heading.
These are NOT rhetorical filler — each question must capture the core of what follows.

Examples of excellent question-led headings:
  "What Led to the Strikes in Paktika?"
  "Who Are the Armed Groups Operating in the Sahel?"
  "Why Does Gao Matter Strategically?"
  "How Will This Affect Regional Security?"
  "What Comes Next for Mali's Civilian Population?"

Rules for question headings:
  - Each heading is a real question (ends with ?), not a statement.
  - Each heading must be specific to the story, not generic.
  - The heading must accurately reflect the content that follows it.
  - Use title case for the heading.
  - Place question headings at the start of each major section of the main story.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARTICLE STRUCTURE — MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY (2-3 sentences, MANDATORY)
  Essential facts only. No throat-clearing. No "In a significant development…"
  Example: "Pakistan launched airstrikes against Afghan territory on Monday, killing at least 33 civilians in Paktika province. The strikes targeted militant positions but hit residential areas, according to Afghan officials. Islamabad has not issued an official statement."

THE STORY (80% of the article — 7-10 substantial paragraphs, MANDATORY)
  The definitive account of the event. Cover: what happened, where, when, why, who, how, background, reactions, impact, current status.
  Each major section of the story MUST begin with a QUESTION-LED HEADING (e.g., "What Led to the Strikes in Paktika?").
  Each paragraph covers a DIFFERENT angle. Suggested progression with question headings:
    1. "What Unfolded on the Ground?" — Open with context or the human stakes (NOT a restatement of the summary)
    2. "Who Are the Key Players?" — The core event with specifics (numbers, locations, casualties) and who is involved (EXPLAIN each organisation/person)
    3. "Why Does This Location Matter?" — Where it happened and WHY that place matters strategically
    4. "What Triggered These Events?" — Why it happened — the cause or trigger
    5. "What Background Led to This Moment?" — Background and prior events leading to this
    6. "How Have Officials Responded?" — Official reactions and statements
    7. "What Is the Human Impact?" — Impact on civilians, the region, or the sector
    8. "What Comes Next?" — What happens next (only if the source states it)
  Each heading is a genuine question specific to the story. The heading must end with a question mark.
  Flowing prose only. No bullets inside the story. At least 450 words (250 in stored-text mode).
  Format: Put each question heading on its own line, followed by the paragraph(s) answering it. Separate sections with a blank line.

BACKGROUND (MANDATORY when the story depends on prior context)
  Prior events a reader with no background would need. Full prose, not bullets.
  Example: "Mali has been in conflict since 2012, when Tuareg rebels in the north declared an independent state called Azawad. The insurgency was later hijacked by jihadi groups linked to al-Qaeda..."

QUESTION-LED SECTIONS (MANDATORY — these are separate structured fields, NOT part of main_story)
  These sections answer the core questions a reader asks. Each must be original prose, NOT a copy of any main_story paragraph. Each section must contain unique information not found elsewhere in the article.

  WHAT HAPPENED (1-2 paragraphs, MANDATORY)
    A concise factual account of the event itself — what actually occurred. Do NOT repeat the summary or main_story. Focus on the bare facts of the event.

  WHY IT MATTERS (1-2 paragraphs, MANDATORY)
    Explain the significance — why this event matters, its impact, and its consequences. Interpret, do not just restate facts.

  HOW IT HAPPENED (1-2 paragraphs, MANDATORY)
    Explain the mechanism or chain of events — how this came to pass. The process, the steps, the causal links.

  WHO & WHERE (1-2 paragraphs, MANDATORY)
    Identify the key people and organizations involved, and where the event took place. EXPLAIN who each person/organization is. Name the location and explain its significance.

  WHAT CAME BEFORE (1-2 paragraphs, MANDATORY when prior context exists)
    The events and history that led to this moment. What happened before that set the stage.

  WHAT HAPPENS NEXT (1-2 paragraphs, only when the source discusses next steps)
    Based ONLY on verified information from the source. Never speculate. Omit if the source doesn't discuss it.

  KEY FACTS (3-5 bullets, MANDATORY)
    Distinct, standalone factual bullets — each a single data point NOT found in any other section. No repetition of Key Developments or Quick Insights.

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

INTERESTING INSIGHT (1-2 paragraphs, MANDATORY)
  An interpretive observation that helps the reader understand the broader significance of the story.
  Write naturally. Never write "You should care" or "It matters because."
  Never invent experts or quotes. If no expert is quoted, write analysis from facts alone.
  Cover: why this matters, how it affects the region or sector, broader consequences, impact on people, international implications.

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
  Choose 5-10 words that ACTUALLY APPEAR in the article text.
  Each word must be genuinely educational (not trivial words like "said", "the", "important", "report").
  Generate fresh vocabulary every article — never repeat generic words across articles.
  Each word MUST have a REAL, ACCURATE, EXACT dictionary definition.
  BAD (FORBIDDEN): "An important word used in this story."
  GOOD: "An official restriction or penalty imposed by one country on another to influence its actions."
  The example sentence MUST be grammatically correct, use the word with the correct meaning, and NOT be copied from the article.
  BAD example: "Researchers ambushed the situation." (wrong usage)
  GOOD example: "The convoy was ambushed on the road to Gao, killing three soldiers."
  The contextInArticle MUST quote the exact sentence from the article where the word appears, showing how it is used in this specific news story.
  BAD contextInArticle: "This word is used to explain the event."
  GOOD contextInArticle: "The government imposed sanctions on several companies after the investigation."
  The pronunciation MUST be proper IPA notation (e.g. /ˈsæŋkʃən/, /ɪmˈbɑːɡoʊ/).
  The wordOrigin should give the etymology when known (e.g. "From Latin 'sanctio' meaning a decree").
  For each word provide:
    - word: the exact word used in the article
    - partOfSpeech: Noun, Verb, Adjective, Adverb, or Phrase
    - meaning: the exact dictionary definition
    - simpleExplanation: a plain-English explanation a school student can understand
    - contextInArticle: the EXACT sentence from the article where the word appears
    - example: a NEW, correct, natural example sentence (NOT from the article)
    - synonyms: 2-5 relevant synonyms
    - antonyms: 1-5 antonyms if applicable (omit if none)
    - pronunciation: proper IPA notation (e.g. /ˈsæŋkʃən/)
    - wordOrigin: brief etymology if known (omit if unknown)

SOURCE NAMES
  Do not include a visible sources section in any story field.
  The system displays source names separately at the end of the article.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORIGINALITY — THE MOST IMPORTANT RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The source text provided to you is RESEARCH NOTES, NOT text to rewrite.
You must NEVER reproduce, copy, translate, or closely paraphrase any source sentence.
You must NEVER follow the source article's paragraph order or headline structure.
Independently organize the facts and explain the story in a fresh editorial structure and clear language.
Every sentence you write must be substantially different in wording from any source sentence.
Every paragraph must use a completely different structure from the source article.
If you find yourself following the source's sequence merely to disguise copying, STOP and reorganize.
The final article must read as if an independent editorial team researched the event and wrote the article from scratch.

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
  "title": "Complete journalistic headline, 60-110 chars, active voice, title case, no trailing period, must read as a complete thought, never cut mid-sentence, never leave quotes unbalanced, never end with ... or an abrupt cut, never end with a dangling 'vs.' or ':' that leaves the reader hanging, must be a self-contained headline that conveys the full story angle and is attractive and unique — avoid generic phrasing like 'New developments in X', make it specific and vivid",
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
    "expert_analysis": "1-2 paragraphs — an interesting interpretive insight about the broader significance — not repeating facts",
    "key_numbers": [{"value": "₹2.4 trillion", "label": "Market loss", "explanation": "What this number means in context"}],
    "people": [{"name": "Full Name", "role": "Their role", "contribution": "What they did or said", "importance": "Why they matter here"}],
    "organizations": [{"name": "Org Name", "explanation": "What the org IS and its role in this story"}],
    "countries": [{"name": "Country", "role": "Their involvement in this story"}],
    "did_you_know": "One verified fascinating fact — omit if none",
    "historical_context": "How this compares to history — omit if not applicable",
    "future_outlook": "What could happen next based on verified info — omit if speculative",
    "what_happened": "1-2 paragraphs explaining what happened — factual, concise, no repetition of summary",
    "why_it_matters": "1-2 paragraphs explaining why this matters — significance, impact, consequences",
    "how_it_happened": "1-2 paragraphs explaining how it happened — the mechanism, process, or chain of events",
    "who_and_where": "1-2 paragraphs identifying who is involved and where it happened — names, roles, locations",
    "what_came_before": "1-2 paragraphs on prior events that led to this — context, history",
    "what_happens_next": "1-2 paragraphs on what happens next based ONLY on verified info — omit if speculative",
    "key_facts": ["Distinct fact 1", "Distinct fact 2", "Distinct fact 3", "Distinct fact 4", "Distinct fact 5"],
    "reader_takeaways": ["Biggest lesson 1", "Biggest lesson 2", "Biggest lesson 3"],
    "timeline": ["Earliest event", "Next event", "Most recent event"],
    "vocabulary": [{"word":"exact word from article","partOfSpeech":"Noun","meaning":"exact dictionary definition","simpleExplanation":"plain-English explanation","contextInArticle":"exact sentence from the article where the word appears","example":"NEW correct example sentence","synonyms":["syn1","syn2"],"antonyms":["ant1"],"pronunciation":"/IPA/","wordOrigin":"brief etymology"}]
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
  /published this article/i,
  /published by/i,
  /source says/i,
  /according to\s+(reuters|bbc|gnews|newsapi|the hindu|times of india|associated press|ap|the guardian|new york times)/i,
  /this is a current/i,
  /readers should check/i,
  /this information provides context/i,
  /this is interesting because/i,
  /readers can learn/i,
  /from the available article information/i,
  /the source information indicates/i,
  /this item was categorized/i,
  /this article provides/i,
  /it is important because it is important/i,
  /this is a specific source-linked item/i,
  /provides context about the event/i,
  /the information provides context/i,
  /check the (original )?source for/i,
  /check the source for future/i,
  /according to available (article )?information/i,
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
  /a story reported by/i,
  /the reporting provides a window into/i,
  /this story matters because it illuminates/i,
  /the reporting highlights/i,
  /track .+ as this story develops/i,
  /the story connects to broader themes/i,
  /this story is drawing attention/i,
  /a closer look at the story/i,
  /understanding .+ what the latest reporting reveals/i,
  /inside the .+ story/i,
  /the story behind the .+ headlines/i,
  /involving .+ and .+,? this .+ story is drawing attention/i,
  /touching on .+,? this .+ story is drawing attention/i,
  /involving .+ and .+,? touching on/i,
  /this .+ story is drawing attention/i,
  /reading between the lines on/i,
  /multikunstneren/i,
  /unpacking the details and what comes next/i,
  /what the latest reporting reveals/i,
  /this .+ story is drawing attention/i,
  /involving .+ and .+,? touching on .+,? this/i,
  /against a backdrop of competing political currents/i,
  /the bottom line$/i,
];

const FORBIDDEN_HEADLINE_PATTERNS = [
  /^understanding .+ what the latest reporting reveals/i,
  /^a closer look at (the )?/i,
  /^inside the .+ story/i,
  /^the story behind .+/i,
  /^reading between the lines/i,
  /^reading between the lines on/i,
  /^what the latest reporting reveals/i,
  /^a deep dive into/i,
  /^exploring .+ a comprehensive/i,
  /^the complete guide to/i,
  /^everything you need to know about/i,
  /^what you need to know about/i,
  /^breaking down .+ what it means/i,
  /^unpacking .+/i,
  /^unpacking the details/i,
  /^unpacking .+ what comes next/i,
  /^the bigger picture/i,
  /^beyond the headlines/i,
  /^behind the headlines/i,
  /^the real story behind/i,
  /^a story reported by/i,
  /^this story matters because/i,
  /^the reporting provides a window into/i,
  /^track .+ as this story develops/i,
  /^the story connects to broader themes/i,
  /^this story is drawing attention/i,
  /^multikunstneren/i,
  /^unpacking the details/i,
  /^understanding \w+:/i,
  /^delisting.+/i,
  /^understanding \w+:.+/i,
  /^inside the \w+ story.+/i,
  /context, players, and implications/i,
  /what the latest reporting reveals/i,
  /unpacking the details.*what comes next/i,
  /^what \w+ reveals/i,
  /^the .+ implications/i,
  /^navigating .+/i,
  /^the shifting landscape of/i,
  /^a new era for/i,
  /^rethinking .+/i,
  /^the future of .+ (is|depends|remains)/i,
  /^how .+ (is|are) changing/i,
  /^why .+ matters( for| in)?/i,
  /^the case for .+/i,
  /^the case against .+/i,
  /^reading the .+ (tea leaves|signals|landscape)/i,
  /^decoding .+/i,
  /^the anatomy of .+/i,
  /^the making of .+/i,
  /^the rise (and fall |& fall )?of .+/i,
  /^what \w+ tells us about/i,
  /^the .+ playbook/i,
  /^the .+ dilemma/i,
  /^the .+ paradox/i,
  /^the .+ question/i,
  /^the .+ problem/i,
  /^the .+ effect/i,
  /^the .+ factor/i,
  /^the .+ equation/i,
  /^the .+ frontier/i,
  /^the .+ divide/i,
  /^the .+ gap/i,
  /^the .+ challenge/i,
  /^the .+ opportunity/i,
  /^the .+ (crisis|opportunity|moment|era)/i,
  /^the .+ (shift|turn|pivot|transition)/i,
  /^the .+ (conundrum|quandary|predicament)/i,
  /^the .+ (test|exam|assessment)/i,
  /^the .+ (debate|argument|controversy|dispute)/i,
  /^the .+ (legacy|impact|consequence|aftermath|fallout)/i,
  /^the .+ (countdown|clock|deadline)/i,
  /^the .+ (guesswork|uncertainty|unknowns)/i,
  /^the .+ (checklist|to-do list|roadmap|blueprint|playbook)/i,
  /^the .+ (reckoning|awakening|revelation)/i,
  /^the .+ (whisper|rumour|rumor|speculation)/i,
  /^the .+ (breakdown|analysis|review|assessment|evaluation|appraisal)/i,
  /^the .+ (takeaway|lesson|morale|insight|takeaway)/i,
  /^the .+ (story|tale|saga|chronicle|narrative)/i,
  /^the .+ (files|dossier|record|archive|chronicle)/i,
  /^the .+ (files|dossier|record|archive|chronicle)/i,
  /^the .+ (conversation|dialogue|discussion|debate)/i,
  /^the .+ (matrix|grid|map|chart|graph|table|diagram)/i,
  /^the .+ (matrix|grid|map|chart|graph|table|diagram)/i,
];

// Common Norwegian/non-English words that leak into headlines from Norwegian sources
const NON_ENGLISH_HEADLINE_WORDS = new Set([
  "tillit", "ysar", "fylkeskommune", "kommune", "storting", "tinget",
  "dagsrevyen", "nyhetsmorgen", "dyrevelferd", "kystvakten", "fylkesmann",
  "kommunal", "beredskap", "friskole", "friskoler", "skole", "skoler",
  "elever", "lærer", "lærere", "undervisning", "foreldrer", "skoleelever",
  "fylkesordfører", "ordfører", "kommune", "kommuner", "fylke", "fylker",
  "stortingsrepresentant", "næringsminister", "finansminister", "justisminister",
  "klimaminister", "kulturminister", "helseminister", "utdanningsminister",
  "forsvarsminister", "landbruksminister", "kommunalminister", "barnehage",
  "barnehager", "forskning", "forsker", "forskere", "universitet", "høgskole",
  "yrkesfag", "studieplass", "studenter", "student", "eksamen", "eksamener",
  "karakter", "karakterer", "vurdering", "vurderinger", "læreplan",
  "arbeidsmarked", "arbeidsliv", "arbeidsgiver", "arbeidstaker", "sykepleier",
  "sykehus", "helse", "helsevesen", "pasient", "pasienter", "behandling",
  "ventetid", "venteliste", "kapasitet", "ressurs", "ressurser", "tilskudd",
  "tilskuddsmidler", "bevilgning", "budsjett", "statsbudsjett", "skatt",
  "skatteetaten", "nav", "trygd", "trygdeetat", "pengestøtte", "stønad",
  "barnebidrag", "kontantstøtte", "sosialhjelp", "dagpenger", "sykepenger",
  "foreldrepenger", "svangerskapspenger", "omsorgspenger", "pleiepenger",
  "opplæringspenger", "tilrettelegging", "ettervern", "oppfølging",
  "verneombud", "arbeidsmiljø", "yrkesskade", "arbeidsulykke",
]);

function hasNonEnglishInHeadline(title: string): boolean {
  if (!title) return false;
  const words = title.toLowerCase().split(/\s+/).filter(Boolean);
  for (const word of words) {
    const clean = word.replace(/[^a-zøæå]/gi, "");
    if (NON_ENGLISH_HEADLINE_WORDS.has(clean)) return true;
    // Detect words with Norwegian-specific characters that aren't proper nouns
    if (/[øæå]/i.test(word) && !/^[A-ZÆØÅ][a-zæøå]+$/.test(word)) return true;
  }
  return false;
}

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
    // Strip content-farm promotional boilerplate (e.g. "Konexio Network helps our society...")
    .replace(/konexio network helps our society[^.]*\./gi, "")
    .replace(/helps our society with the daily business[^.]*\./gi, "")
    .replace(/corporate interview,? article on market and general article[^.]*\./gi, "")
    .replace(/which help our readers[^.]*\./gi, "")
    .replace(/daily business news updates[^.]*\./gi, "")
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

const GENERIC_VOCAB_MEANING_RX = /^(an?\s+)?(important|key|significant|useful|technical|specialized|complex|difficult|unfamiliar)\s+(word|term)\s+(used|in|appearing|found|mentioned|that\s+may\s+be)\s+(in|this|the)\s+(article|story|context|text|piece|report)/i;
const GENERIC_VOCAB_MEANING_RX2 = /^(a\s+)?term\s+used\s+in\s+this\s+(article|story)/i;
const GENERIC_VOCAB_MEANING_RX3 = /^(an?\s+)?(word|term)\s+(that\s+)?(may\s+be|is)\s+(unfamiliar|new|uncommon|difficult)/i;

function isGenericVocabMeaning(meaning: string | undefined): boolean {
  if (!meaning || meaning.trim().length < 5) return true;
  if (/an important (word|term) used in this story/i.test(meaning)) return true;
  if (GENERIC_VOCAB_MEANING_RX.test(meaning)) return true;
  if (GENERIC_VOCAB_MEANING_RX2.test(meaning)) return true;
  if (GENERIC_VOCAB_MEANING_RX3.test(meaning)) return true;
  return false;
}

async function buildVocabulary(story: Processed["story"]): Promise<VocabEntry[]> {
  const articleText = `${story.summary || ""} ${story.main_story || ""} ${story.background || ""} ${story.expert_analysis || ""}`;
  const articleNorm = normalizeText(articleText);
  const existing = (story.vocabulary || [])
    .filter((v) => v?.word && !GENERIC_VOCAB.has(v.word.toLowerCase().trim()))
    .filter((v) => articleNorm.includes(normalizeText(v.word)))
    .filter((v) => !isGenericVocabMeaning(v.meaning))
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
    if (!isGenericVocabMeaning(entry.meaning)) {
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
  let cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  // Strip trailing ellipsis / dots / dashes that signal truncation
  cleaned = cleaned.replace(/(?:\s*\.\.\.|\s*\u2026|\s*\.\s*\.\s*\.|\s*[-\u2014]\s*)$/i, "").trim();
  // Strip a trailing lone "vs." or "vs" that signals an incomplete comparison
  cleaned = cleaned.replace(/\s+vs\.?\s*$/i, "").trim();
  // Strip trailing colon (incomplete list headline)
  cleaned = cleaned.replace(/[:\s]+$/, "").trim();

  if (!cleaned) return "";

  // Balance single quotes
  const singleOpen = (cleaned.match(/'/g) || []).length;
  if (singleOpen % 2 === 1) {
    if (cleaned.startsWith("'") && !cleaned.endsWith("'")) cleaned += "'";
    else if (cleaned.startsWith('"') && !cleaned.endsWith('"')) cleaned += '"';
    else cleaned = cleaned.replace(/'([^']*)$/, "'$1'");
  }
  const doubleOpen = (cleaned.match(/"/g) || []).length;
  if (doubleOpen % 2 === 1) {
    if (cleaned.startsWith('"') && !cleaned.endsWith('"')) cleaned += '"';
    else cleaned = cleaned.replace(/"([^"]*)$/, '"$1"');
  }
  // If the headline ends mid-sentence (no terminal punctuation) and contains
  // multiple sentences, cut back to the last complete sentence.
  if (!/[.!?]["'')]*$/.test(cleaned)) {
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const complete = sentences.slice(0, -1).join(" ").trim();
      if (complete.length > 10) return complete;
    }
  }
  return cleaned;
}

function buildStoredArticleFallback(raw: RawItem): Processed | null {
  // When we don't have enough source text to write a real article, return null.
  // The caller will drop the item rather than publish garbage.
  return null;
}

// When all AI providers fail, we do NOT publish a mechanical rewrite.
// The deterministic fallback was producing keyword-template garbage.
// Instead, return null so the caller drops the item rather than
// publishing a bad article. The quality standard is: AI-written or nothing.
function buildDeterministicArticle(_raw: RawItem, _sourceBody: string): Processed | null {
  return null;
}

async function sanitizeProcessed(out: Processed, raw: RawItem): Promise<Processed> {
  const story = out.story || ({} as Processed["story"]);
  const keyDevelopments = cleanDistinctList(cleanListValues(story.key_developments), [], 5);
  const quickInsights = cleanDistinctList(cleanInsightValues(story.quick_insights), keyDevelopments, 6);
  const vocabulary = (await buildVocabulary(story)).slice(0, 5);
  return {
    ...out,
    title: cleanTitleBoundary(cleanEditorialText(out.title) || ""),
    dek: truncateAtWordBoundary(cleanEditorialText(out.dek) || "", 300),
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
      what_happened: cleanEditorialText((story as any).what_happened),
      how_it_happened: cleanEditorialText((story as any).how_it_happened),
      who_and_where: cleanEditorialText((story as any).who_and_where),
      what_came_before: cleanEditorialText((story as any).what_came_before),
      key_facts: cleanListValues((story as any).key_facts).length ? cleanListValues((story as any).key_facts) : undefined,
      vocabulary,
      sources: [{ name: raw.source || raw.url, url: raw.url }],
    },
  };
}

function scoreArticle(out: Processed, sourceBody: string, storedTextMode?: boolean, sourceTitle?: string): number {
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
    if (isGenericVocabMeaning(v.meaning)) score -= 10;
  }
  // Key Developments / Quick Insights overlap
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((q) => (story.key_developments || []).some((k) => similarity(k, q) >= 0.40))) score -= 10;
  // Forbidden patterns
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) score -= 20;
  // Generic template headline penalty
  if (out.title && FORBIDDEN_HEADLINE_PATTERNS.some((rx) => rx.test(out.title.trim()))) score -= 25;
  // Non-English word in headline penalty
  if (out.title && hasNonEnglishInHeadline(out.title.trim())) score -= 25;
  // Copied phrases from source
  if (hasCopiedPhrase(combined, sourceBody)) score -= 15;
  if (hasCopiedSentence(combined, sourceBody)) score -= 20;
  if (hasCopiedParagraphStructure(story.main_story, sourceBody)) score -= 20;
  if (sourceTitle && hasCopiedHeadline(out.title || "", sourceTitle)) score -= 15;
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

function describeQualityFailures(out: Processed, sourceBody: string, storedTextMode?: boolean, sourceTitle?: string): string[] {
  const failures: string[] = [];
  const story = out.story;
  const combined = `${out.title}\n${out.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}\n${story.expert_analysis || ""}`;
  if (wordCount(story.main_story) < (storedTextMode ? 250 : 450)) failures.push("main story too short");
  if (wordCount(story.summary) < 20) failures.push("summary too short");
  if ((story.vocabulary || []).length < 4) failures.push("missing vocabulary");
  for (const v of story.vocabulary || []) {
    if (isGenericVocabMeaning(v.meaning)) failures.push("generic vocabulary definitions");
  }
  if ((story.key_developments || []).length >= 2 && (story.quick_insights || []).some((q) => (story.key_developments || []).some((k) => similarity(k, q) >= 0.40))) failures.push("Key Developments overlap with Quick Insights");
  if (FORBIDDEN_ARTICLE_PATTERNS.some((rx) => rx.test(combined))) failures.push("contains forbidden patterns (source names or AI cliches)");
  if (out.title && FORBIDDEN_HEADLINE_PATTERNS.some((rx) => rx.test(out.title.trim()))) failures.push("generic template headline — write a specific, story-driven headline");
  if (out.title && hasNonEnglishInHeadline(out.title.trim())) failures.push("non-English word in headline — write an English-only headline");
  if (hasCopiedPhrase(combined, sourceBody)) failures.push("copied source phrasing");
  if (hasCopiedSentence(combined, sourceBody)) failures.push("copied sentence structure from source");
  if (hasCopiedParagraphStructure(story.main_story, sourceBody)) failures.push("paragraph structure follows source order");
  if (sourceTitle && hasCopiedHeadline(out.title || "", sourceTitle)) failures.push("headline too similar to source headline");
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
  for (let i = 0; i <= outWords.length - 8; i++) {
    const phrase = outWords.slice(i, i + 8).join(" ");
    if (phrase.length > 35 && sourceNorm.includes(` ${phrase} `)) return true;
  }
  return false;
}

// Sentence-level originality check: compare every generated sentence against
// every source sentence. If any pair is too similar (>=0.55), the article
// is not sufficiently original and must be regenerated.
function hasCopiedSentence(output: string, source: string): boolean {
  const sourceSentences = splitSentences(source);
  const outputSentences = splitSentences(output);
  if (sourceSentences.length === 0 || outputSentences.length === 0) return false;
  for (const outSent of outputSentences) {
    for (const srcSent of sourceSentences) {
      if (similarity(outSent, srcSent) >= 0.50) return true;
    }
  }
  return false;
}

// Headline originality check: the generated headline must not be too similar
// to the source title.
function hasCopiedHeadline(headline: string, sourceHeadline: string): boolean {
  if (!headline || !sourceHeadline) return false;
  return similarity(headline, sourceHeadline) >= 0.55;
}

// Paragraph-structure originality check: detect sentence-by-sentence paraphrasing
// where the AI follows the source's paragraph order, rewriting each sentence
// just enough to pass the per-sentence check. If multiple output paragraphs
// are individually similar to source paragraphs in the SAME ORDER, the article
// is structurally copied and must be rejected.
function hasCopiedParagraphStructure(output: string, source: string): boolean {
  const sourceParas = source.split(/\n{2,}/).map((p) => p.trim()).filter((p) => wordCount(p) >= 20);
  const outputParas = output.split(/\n{2,}/).map((p) => p.trim()).filter((p) => wordCount(p) >= 20);
  if (sourceParas.length < 3 || outputParas.length < 3) return false;
  // Count how many output paragraphs match source paragraphs in sequence order.
  // If 3+ consecutive paragraphs match at >=0.35 similarity, it's structural copying.
  let consecutiveHits = 0;
  let maxConsecutive = 0;
  let srcIdx = 0;
  for (const outPara of outputParas) {
    let found = false;
    // Check against the current and next 2 source paragraphs (allowing slight reordering)
    for (let s = srcIdx; s < Math.min(srcIdx + 3, sourceParas.length); s++) {
      if (similarity(outPara, sourceParas[s]) >= 0.35) {
        found = true;
        srcIdx = s + 1;
        break;
      }
    }
    if (found) {
      consecutiveHits++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveHits);
    } else {
      consecutiveHits = 0;
    }
  }
  return maxConsecutive >= 3;
}

function qualityPass(out: Processed, sourceBody: string, opts?: { storedTextMode?: boolean; sourceTitle?: string }) {
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
  if (hasCopiedSentence(combined, sourceBody)) return false;
  if (hasCopiedParagraphStructure(story.main_story, sourceBody)) return false;
  if (opts?.sourceTitle && hasCopiedHeadline(out.title || "", opts.sourceTitle)) return false;
  if (out.title && FORBIDDEN_HEADLINE_PATTERNS.some((rx) => rx.test(out.title.trim()))) return false;
  if (out.title && hasNonEnglishInHeadline(out.title.trim())) return false;
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
    if (isGenericVocabMeaning(v.meaning)) return false;
    if (v.example && normalizeText(v.example).length > 20 && articleLower.includes(normalizeText(v.example).slice(0, 40))) return false;
  }
  return true;
}

export async function processItem(raw: RawItem): Promise<Processed | null> {
  const allowed = ALLOWED_SLUGS.join(", ");
  const fullText = await fetchArticleFullText(raw.url);
  const descriptionWords = wordCount(raw.description);
  const sourceBody = fullText.length > 1200 ? fullText : (raw.description || "").slice(0, 10000);
  const hasCompleteSource = fullText.length > 1200 || descriptionWords >= (raw.allowStoredText ? 80 : 250);
  if (!hasCompleteSource || wordCount(sourceBody) < (raw.allowStoredText ? 80 : 250)) return raw.allowStoredText ? buildStoredArticleFallback(raw) : null;

  try {
    const basePrompt = `Allowed category slugs (pick the single best match): ${allowed}
${raw.forcedCategory ? `STRONG HINT: this item was sourced for category "${raw.forcedCategory}". Use it unless clearly wrong.` : ""}
${raw.forcedCountryCode ? `STRONG HINT: this item is from a Norwegian news source. Set country_code to "${raw.forcedCountryCode}" (Norway) unless the article is clearly about a different country.` : ""}

Raw item:
TITLE: ${raw.title}
SOURCE: ${raw.source}
PUBLISHED: ${raw.publishedAt}
URL: ${raw.url}

RESEARCH NOTES (use ONLY facts present here — never invent people, numbers, quotes, dates, or events that are not in this text):
${sourceBody}

IMPORTANT: The text above is RESEARCH NOTES, NOT text to rewrite. Use the supplied material only as factual research. Write an independently structured article for The United Hell. Do not reproduce source sentences, paragraphs, headline wording, or the source article's sequence. Do not perform sentence-by-sentence paraphrasing. Independently synthesize the verified facts and explain them clearly in original language. Do not reproduce, copy, translate, or closely paraphrase any source sentence. Do not follow the source article's paragraph order or headline structure. Independently organize the facts and explain the story in a fresh editorial structure and clear language.

STRICT NO-INVENTION RULE: Use ONLY facts present in the research notes. Never invent people, numbers, quotes, dates, measurements, symptoms, laboratory results, causes, medical explanations, or events that are not in the source text. Do not add precise measurements, patient names, or symptoms beyond what the supplied report states. If a detail is not in the source, omit it. Extract the facts → organize them intelligently → explain them naturally → add only supported context → validate → publish.

First build an internal fact sheet from the research notes. FORGET the original wording — do not look at it again. Then write a completely new premium news article from the fact sheet in your own original editorial voice.${raw.allowStoredText ? "\n\nNOTE: The source text may be brief. You may use your general knowledge to provide background context about well-known organizations, people, and places mentioned (e.g., what a company does, what a city is known for), but you must NOT fabricate specific quotes, statistics, dates, or events not in the source text." : ""}

The main_story MUST be 6-10 distinct paragraphs and at least ${raw.allowStoredText ? "250" : "450"} words of flowing prose. The FIRST paragraph must NOT restate the summary — open with a new angle (context, a key detail, or the human stakes). Each subsequent paragraph covers a DIFFERENT angle: the core event, who is involved (EXPLAIN what each organisation/person/place IS — never just name-drop), where it happened and WHY that place matters, why it happened, background, reactions, impact.

Use QUESTION-LED HEADINGS to introduce each major section of the main story (e.g., "What Led to This Event?", "Who Are the Key Players?", "Why Does This Location Matter?", "What Comes Next?"). Each heading must be a genuine question specific to the story, ending with a question mark. Do not mention the outlet, publication, or platform name (Reuters, BBC, CNN, etc.) inside story sections. Key Developments and Quick Insights must not repeat each other or the main story. Every paragraph must add NEW information. Never repeat the headline or summary inside paragraphs. Do not copy any 10+ word phrase from the source — rewrite everything in original newsroom prose.

Fill in why_it_matters, key_numbers, people, organizations, countries, did_you_know, historical_context, future_outlook, and reader_takeaways from verified facts in the source. Omit any section the source does not support. For organizations and people, EXPLAIN who/what they are — a reader must learn what each one is, not just see a name.

Vocabulary: pick 5-10 words that ACTUALLY APPEAR in the article. Each MUST have an EXACT dictionary definition, a CORRECT natural example sentence (NOT from the article), the EXACT sentence from the article as contextInArticle, proper IPA pronunciation, and word origin if known. Never write "an important word used in this story". Never write nonsensical example sentences. Never write generic context like "this word is used in the story".`;

    let out = await orJson<Processed>({ system: SYSTEM, prompt: basePrompt });
    if (!out?.title) throw new Error("Initial AI generation returned no title");
    let cleaned = await sanitizeProcessed(out, raw);
    let qualityScore = scoreArticle(cleaned, sourceBody, raw.allowStoredText, raw.title);
    if (!qualityPass(cleaned, sourceBody, { storedTextMode: raw.allowStoredText, sourceTitle: raw.title }) || qualityScore < 90) {
      // First rewrite with specific failure feedback
      try {
        const failures = describeQualityFailures(cleaned, sourceBody, raw.allowStoredText, raw.title);
        out = await orJson<Processed>({
          system: SYSTEM,
          prompt: `${basePrompt}\n\nYour previous draft scored ${qualityScore}/100 and failed these checks: ${failures.join("; ")}. Rewrite from scratch with 7-10 substantial paragraphs of original prose, each major section introduced by a QUESTION-LED HEADING (e.g., "What Led to This Event?"), zero repetition, no outlet names in the body, five unique vocabulary words actually used in the article with EXACT dictionary definitions (not "an important word used in this story"), no example sentences, and distinct bullet sections where Key Developments and Quick Insights share zero overlap.`,
          temperature: 0.72,
        });
        if (!out?.title) throw new Error("First rewrite returned no title");
        cleaned = await sanitizeProcessed(out, raw);
        qualityScore = scoreArticle(cleaned, sourceBody, raw.allowStoredText, raw.title);
        if (!qualityPass(cleaned, sourceBody, { storedTextMode: raw.allowStoredText, sourceTitle: raw.title }) || qualityScore < 90) {
          // Second rewrite attempt with even higher temperature
          try {
            out = await orJson<Processed>({
              system: SYSTEM,
              prompt: `${basePrompt}\n\nYour draft still scored ${qualityScore}/100. This is your final chance. Write a completely different article from scratch. Use a different opening, different structure, different transitions. 7-10 paragraphs, each with unique facts, each major section introduced by a QUESTION-LED HEADING. No repetition whatsoever. Exact vocabulary definitions, no example sentences. No source names.`,
              temperature: 0.85,
            });
            if (!out?.title) throw new Error("Second rewrite returned no title");
            cleaned = await sanitizeProcessed(out, raw);
            if (!qualityPass(cleaned, sourceBody, { storedTextMode: raw.allowStoredText, sourceTitle: raw.title })) throw new Error("Quality check failed after second rewrite");
          } catch (innerErr2) {
            throw innerErr2;
          }
        }
      } catch (innerErr1) {
        throw innerErr1;
      }
    }
    const inferredCategory = categoryFromHint(raw);
    if (inferredCategory) {
      cleaned.category = inferredCategory;
    } else if (!cleaned.category || !ALLOWED_SLUGS.includes(cleaned.category)) {
      cleaned.category = "discovery";
    }
    if (raw.forcedCountryCode) {
      cleaned.country_code = raw.forcedCountryCode;
    }
    cleaned.sourceBody = sourceBody;
    // Enrich with weather data for climate/weather-related articles
    const cat = cleaned.category || "";
    if (["climate", "nature", "world", "science"].includes(cat) && cleaned.story?.countries?.length) {
      try {
        const country = cleaned.story.countries.find((c) => c.name);
        if (country?.name) {
          const weather = await fetchWeather(country.name);
          if (weather) {
            (cleaned.story as Record<string, unknown>).weather = {
              temp: weather.temp,
              feelsLike: weather.feelsLike,
              humidity: weather.humidity,
              description: weather.description,
              city: weather.city,
              country: weather.country,
            };
          }
        }
      } catch {}
    }
    // Enrich with country data for world/geography articles
    if (["world", "geopolitics", "global-affairs"].includes(cat) && cleaned.country_code) {
      try {
        const countryData = await fetchCountry(cleaned.country_code);
        if (countryData) {
          (cleaned.story as Record<string, unknown>).country_info = {
            name: countryData.name,
            capital: countryData.capital,
            region: countryData.region,
            population: countryData.population,
            area: countryData.area,
            languages: countryData.languages,
            currencies: countryData.currencies,
            flag: countryData.flag,
          };
        }
      } catch {}
    }
    return cleaned;
  } catch (e) {
    console.error("[ingest] AI process failed, using deterministic fallback:", (e as Error).message);
    const fallback = buildDeterministicArticle(raw, sourceBody);
    if (fallback) {
      try {
        const cleaned = await sanitizeProcessed(fallback, raw);
        const inferredCategory = categoryFromHint(raw);
        if (inferredCategory) cleaned.category = inferredCategory;
        else if (!cleaned.category || !ALLOWED_SLUGS.includes(cleaned.category)) cleaned.category = "discovery";
        if (raw.forcedCountryCode) cleaned.country_code = raw.forcedCountryCode;
        cleaned.sourceBody = sourceBody;
        return cleaned;
      } catch (sanitizeErr) {
        console.error("[ingest] Deterministic fallback sanitize failed:", (sanitizeErr as Error).message);
        return fallback;
      }
    }
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

// Final publication guard — the ONLY gate that decides whether an article
// may be visible to readers. Every DB write path (insert, reprocess,
// regenerate, queue drain) MUST call this and set is_published accordingly.
// Returns true ONLY when the article is complete, original, and clean.
function finalPublicationGuard(p: Processed, sourceBody?: string): boolean {
  if (!p) return false;
  if (!validateArticleContent(p, sourceBody)) return false;
  // Cover image is optional — content quality is the only hard gate
  return true;
}

// Content validation pipeline — reject publication if validation fails.
// sourceBody is the original external text; we reject if the generated
// article is suspiciously similar to it (raw passthrough guard).
function validateArticleContent(p: Processed, sourceBody?: string): boolean {
  if (!p) return false;
  // Headline exists and is complete (not truncated)
  if (!p.title || p.title.trim().length < 10) return false;
  if (/\.\.\.|\u2026|\bvs\.?\s*$|:\s*$|\bvs\.?\s+\w*$/i.test(p.title.trim())) return false;
  // Summary exists
  if (!p.dek || p.dek.trim().length < 20) return false;
  // Body exists
  const story = p.story || ({} as Processed["story"]);
  const bodyText = [story.summary, story.main_story, story.background].filter(Boolean).join(" ");
  if (!bodyText || bodyText.trim().length < 100) return false;
  // No advertisement code
  const allText = [p.title, p.dek, bodyText, ...(story.key_developments || []), ...(story.quick_insights || [])].join(" ");
  // Raw-source passthrough guard: if the generated body is nearly identical
  // to the source text, the AI failed to rewrite — reject before publication.
  if (sourceBody && sourceBody.length > 200) {
    if (hasCopiedSentence(allText, sourceBody)) return false;
    if (hasCopiedPhrase(allText, sourceBody)) return false;
  }
  if (/blogherads|googletag|gpt-dsk|setTargeting|defineSlot|adthrive|<script|<iframe|<ins\b/i.test(allText)) return false;
  // No promotional boilerplate from content farms / PR syndicators (e.g. Konexio Network)
  if (PROMOTIONAL_BOILERPLATE.test(allText)) return false;
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
  // Reject vague/placeholder/template phrases — these indicate the AI failed to generate real content
  if (/provides a window into|reporting highlights.*as a key element|track this story as this story develops|fits within the broader.*landscape|the reporting provides|A story reported by.*centers on|Key figures mentioned include|To understand the significance of this reporting/i.test(allText)) return false;
  // Reject template-style "Story Behind the X Headlines" headlines
  if (p.title && /the story behind the \w+ headlines/i.test(p.title.trim())) return false;
  // Summary must be a genuine summary (not a fragment or UI text)
  if (story.summary && story.summary.trim().length < 30) return false;
  // Key Developments must exist and not be template phrases
  if (!story.key_developments || story.key_developments.length < 1) return false;
  if (story.key_developments.some((d: string) => /Coverage focuses on|feature prominently in the reporting|provides additional context for readers/i.test(d))) return false;
  // Vocabulary must exist
  if (!story.vocabulary || story.vocabulary.length < 1) return false;
  // Reject template-style headlines
  if (p.title && FORBIDDEN_HEADLINE_PATTERNS.some((rx) => rx.test(p.title.trim()))) return false;
  // Reject headlines containing non-English (Norwegian) words
  if (p.title && hasNonEnglishInHeadline(p.title.trim())) return false;
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
  const textFields = ["summary", "main_story", "background", "expert_analysis", "why_it_matters", "did_you_know", "future_outlook", "historical_context", "what_happens_next", "what_happened", "how_it_happened", "who_and_where", "what_came_before"];
  const listFields = ["key_developments", "quick_insights", "reader_takeaways", "timeline", "tags", "key_facts"];
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
  // Preserve sources in story JSONB — source attribution is required for publication.
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
      // Preserve sources — never null them out. Source attribution is required.
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
        const { data: allCovers } = await supabase.from("articles").select("cover_image_url").not("cover_image_url", "is", null).limit(5000);
        const existingImages = new Set<string>(((allCovers ?? []) as { cover_image_url: string | null }[]).map((r) => r.cover_image_url).filter(Boolean) as string[]);
        const subject = (row.title || "").replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter((w: string) => w.length >= 4).slice(0, 5).join(" ");
        const cover = (await pexelsImage(subject, { excludeUrls: existingImages })) || (await pexelsImage(row.category || "news", { excludeUrls: existingImages })) || getCategoryFallbackImage(row.category || "world", `${row.title}-${row.id}`, existingImages);
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
  const max = opts?.maxItems ?? 60;
  const queryBudget = opts?.mode === "manual" ? (max >= 80 ? 12 : max >= 36 ? 6 : 3) : 3;

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
    fromFinancialAPIs(),
    fromArXiv(),
    fromWorldBankData(),
    fromNASAAPOD(),
    fromNASAEONET(),
    fromGBIFSpecies(),
    fromOBISMarine(),
    fromCrossrefRecent(),
    fromNASANeoWs(),
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
      // Reject items from blocked promotional sources
      if (BLOCKED_SOURCES.test(q.source || "")) return false;
      // Reject items whose title or description contains promotional boilerplate
      const combinedText = `${q.title} ${q.description || ""}`;
      if (PROMOTIONAL_BOILERPLATE.test(combinedText)) return false;
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
    // Build a rich, article-specific image query using AI-extracted entities.
    // Priority: story people/orgs/places > AI tags > title keywords > category.
    const storyEntities: string[] = [];
    if (p.story?.people?.length) {
      for (const person of p.story.people.slice(0, 2)) {
        if (person.name) storyEntities.push(person.name);
      }
    }
    if (p.story?.organizations?.length) {
      for (const org of p.story.organizations.slice(0, 2)) {
        if (org.name && !/reuters|bbc|cnn|associated press|bloomberg/i.test(org.name)) {
          storyEntities.push(org.name);
        }
      }
    }
    if (p.story?.countries?.length) {
      for (const country of p.story.countries.slice(0, 2)) {
        if (country.name) storyEntities.push(country.name);
      }
    }
    // Use entity-based query first — most relevant to the actual story
    if (!cover && storyEntities.length >= 1) {
      const entityQuery = storyEntities.join(" ").slice(0, 100);
      cover = await pexelsImage(entityQuery, { excludeUrls: existingImages });
    }
    // Then try AI-generated tags if available
    if (!cover && p.tags?.length) {
      const tagQuery = p.tags.slice(0, 3).join(" ");
      if (tagQuery.trim()) cover = await pexelsImage(tagQuery, { excludeUrls: existingImages });
    }
    // Title keyword extraction — stopword-filtered, meaningful words only
    const titleSubject = (p.title || raw.title)
      .replace(/[^A-Za-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them|what|when|where|which|while|could|would|should|does|doing|done|being|having|more|most|some|such|also|than|then|once|here|there|were|they|your|their|every|many|much|very|over|under|into|upon|onto|between|among|during|before|after|since|until|above|below|between|against|during|without|within|along|across|behind|beyond|around|about|above|below|from|into|near|off|past|round|through|toward|underneath|unlike|until|upon|with|within|without)$/i.test(w))
      .slice(0, 6)
      .join(" ");
    if (!cover && titleSubject) cover = await pexelsImage(titleSubject, { excludeUrls: existingImages });
    if (!cover) cover = await pexelsImage(p.title || raw.title, { excludeUrls: existingImages });
    // Use story summary keywords as a last specific search before category fallback
    if (!cover && p.story?.summary) {
      const summaryKeywords = p.story.summary
        .replace(/[^A-Za-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them|what|when|where|which|while|could|would|should|does|doing|done|being|having|more|most|some|such|also|than|then|once|here|there|were|they|your|their|every|many|much|very|over|under|into|upon|onto|between|among|during|before|after|since|until|above|below|between|against|during|without|within|along|across|behind|beyond|around|about|above|below|from|into|near|off|past|round|through|toward|underneath|unlike|until|upon|with|within|without|according|reported|statement|announcement|official|spokesperson|representative|department|ministry|government|agency|council|committee|commission|organization|institution|university|research|study|report|analysis|investigation|examination|review|assessment|evaluation|program|project|initiative|campaign|operation|activity|event|incident|situation|development|progress|advance|breakthrough|discovery|achievement|success|improvement|enhancement|upgrade|update|version|release|launch|opening|beginning|start|creation|establishment|formation|foundation|introduction|presentation|demonstration|exhibition|display|performance|function|feature|capability|ability|quality|characteristic|property|attribute|aspect|factor|element|component|part|piece|section|segment|portion|fraction|division|category|class|group|type|kind|sort|variety|form|format|structure|arrangement|organization|system|method|process|procedure|technique|approach|strategy|tactic|plan|scheme|design|pattern|model|framework|foundation|basis|ground|platform|stage|level|degree|extent|range|scope|scale|size|dimension|measure|amount|quantity|number|figure|statistic|data|information|detail|fact|truth|reality|actual|real|genuine|authentic|true|correct|accurate|exact|precise|specific|particular|individual|single|sole|only|unique|special|distinct|separate|different|various|several|multiple|numerous|countless|many|much|few|little|less|least|small|large|big|great|huge|vast|enormous|massive|substantial|significant|considerable|notable|remarkable|extraordinary|exceptional|outstanding|excellent|superior|better|best|worst|worse|bad|good|fine|nice|well|poorly|badly|good|great)$/i.test(w))
        .slice(0, 4)
        .join(" ");
      if (summaryKeywords) cover = await pexelsImage(summaryKeywords, { excludeUrls: existingImages });
    }
    if (!cover) cover = await pexelsImage(`${p.tags?.[0] || ""} ${p.category || raw.topicHint || "news"}`.trim(), { excludeUrls: existingImages });
    if (!cover) cover = getCategoryFallbackImage(p.category || raw.forcedCategory || "world", `${p.title}-${raw.url}`, existingImages);
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
    let cover = item.cover || getCategoryFallbackImage(p.category || raw.forcedCategory || "world", `${p.title}-${raw.url}`);
    p.coverImageUrl = cover;
    // Final validation before insert — the absolute publication gate
    if (!finalPublicationGuard(p, p.sourceBody || item.raw.description)) { errors++; continue; }
    const titleKey = normalizeText(p.title);
    const urlKey = normalizeUrl(raw.url);
    const contentHash = await sha256(titleKey + "|" + urlKey);
    if (batchTitles.has(titleKey) || batchUrls.has(urlKey) || batchHashes.has(contentHash) || existingHashSet.has(contentHash)) { errors++; continue; }
    if (cover && batchImages.has(cover)) {
      const retrySubject = (p.title || raw.title)
        .replace(/[^A-Za-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them)$/i.test(w))
        .slice(0, 6)
        .join(" ");
      const retryCover = await pexelsImage(`${retrySubject} news`, { excludeUrls: new Set([...existingImages, ...batchImages]) });
      cover = retryCover || getCategoryFallbackImage(p.category || raw.forcedCategory || "world", `${p.title}-${raw.url}`, new Set([...existingImages, ...batchImages]));
    }
    batchTitles.add(titleKey);
    batchUrls.add(urlKey);
    batchHashes.add(contentHash);
    if (cover) batchImages.add(cover);
    // Fetch a relevant video for this article
    let coverVideoUrl: string | null = null;
    try {
      const videoSubject = (p.title || raw.title)
        .replace(/[^A-Za-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them)$/i.test(w))
        .slice(0, 5)
        .join(" ");
      if (videoSubject) {
        const vid = await pexelsVideo(videoSubject);
        if (vid) coverVideoUrl = vid.videoUrl;
      }
    } catch {}
    rows.push({
      slug: `${slugify(p.title)}-${Math.random().toString(36).slice(2, 6)}`,
      title: p.title,
      dek: p.dek || null,
      category: p.category,
      subcategory: p.subcategory || null,
      cover_image_url: cover || getCategoryFallbackImage(p.category || raw.forcedCategory || "world"),
      cover_video_url: coverVideoUrl,
      read_time_minutes: 4,
      source_count: 1,
      sources: [{ name: raw.source || raw.url, url: raw.url }] as unknown as Database["public"]["Tables"]["articles"]["Insert"]["sources"],
      story: ({ ...(p.story || {}), sources: [{ name: raw.source || raw.url, url: raw.url }] } as unknown) as Database["public"]["Tables"]["articles"]["Insert"]["story"],
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
export async function backfillVocabulary(opts?: { limit?: number }): Promise<{
  attempted: number;
  updated: number;
  failed: number;
  remaining: number;
}> {
  const supabase = adminClient();
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 50);

  const { data: rows } = await supabase
    .from("articles")
    .select("id, title, story")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(5000);

  const candidates = (rows ?? [])
    .filter((r: any) => {
      const vocab = r.story?.vocabulary;
      return !vocab || !Array.isArray(vocab) || vocab.length < 4;
    })
    .slice(0, limit) as Array<{ id: string; title: string; story: any }>;

  let updated = 0;
  let failed = 0;

  await pMap(candidates, 5, async (row) => {
    try {
      const story = row.story || {};
      const enriched = await buildVocabulary(story);
      if (enriched.length >= 4) {
        const newStory = { ...story, vocabulary: enriched };
        const { error } = await supabase
          .from("articles")
          .update({ story: newStory })
          .eq("id", row.id);
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
  });

  const { data: remainingRows } = await supabase
    .from("articles")
    .select("id, story")
    .eq("is_published", true)
    .limit(5000);

  const remaining = (remainingRows ?? []).filter((r: any) => {
    const vocab = r.story?.vocabulary;
    return !vocab || !Array.isArray(vocab) || vocab.length < 4;
  }).length;

  return { attempted: candidates.length, updated, failed, remaining };
}

export async function reprocessBatch(opts?: { limit?: number; force?: boolean }): Promise<{
  attempted: number;
  updated: number;
  failed: number;
  remaining: number;
}> {
  const supabase = adminClient();
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 200);
  let query = supabase
    .from("articles")
    .select("id, title, dek, story, sources, category, cover_image_url")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (!opts?.force) {
    query = query.is("reprocessed_at", null);
  }
  const { data: rows } = await query;

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

  // Fetch all existing cover images to avoid duplicates
  const { data: existingImgRows } = await supabase
    .from("articles")
    .select("cover_image_url")
    .not("cover_image_url", "is", null)
    .limit(5000);
  const existingImages = new Set<string>(((existingImgRows ?? []) as { cover_image_url: string | null }[]).map((r) => r.cover_image_url).filter(Boolean) as string[]);

  await pMap(items, 5, async (row) => {
    const existingStory = row.story || ({} as Processed["story"]);
    // Extract source URL from either the top-level sources column or the story JSONB.
    const storySources = (row.story as any)?.sources as Array<{ name?: string; url?: string }> | undefined;
    const topLevelSources = row.sources as Array<{ name?: string; url?: string }> | null;
    const sourceEntry = (topLevelSources && topLevelSources.length > 0 ? topLevelSources[0] : null)
      || (storySources && storySources.length > 0 ? storySources[0] : null);
    const sourceUrl = sourceEntry?.url || "";
    const sourceName = sourceEntry?.name || "Archive";

    // Step 1: Try to fetch the ORIGINAL source article from its URL.
    // This gives us the raw source text — NOT the existing article.
    let sourceText = "";
    if (sourceUrl) {
      sourceText = await fetchArticleFullText(sourceUrl);
    }

    // Step 2: If we couldn't fetch the original source, extract FACTUAL NOTES
    // from the existing article — not the article text itself. We build a
    // structured fact sheet so the AI works from facts, not from copied prose.
    if (!sourceText || sourceText.length < 250) {
      const facts: string[] = [];
      if (row.title) facts.push(`Headline topic: ${row.title}`);
      if (row.dek) facts.push(`Summary: ${row.dek}`);
      if (existingStory.key_developments?.length) {
        facts.push(`Key developments:\n${existingStory.key_developments.map((d) => `- ${d}`).join("\n")}`);
      }
      if (existingStory.quick_insights?.length) {
        facts.push(`Quick insights:\n${existingStory.quick_insights.map((q) => `- ${q}`).join("\n")}`);
      }
      if (existingStory.people?.length) {
        facts.push(`People involved: ${existingStory.people.map((p: any) => `${p.name} (${p.role || "unknown role"})`).join(", ")}`);
      }
      if (existingStory.organizations?.length) {
        facts.push(`Organizations: ${existingStory.organizations.map((o: any) => `${o.name} — ${o.explanation || "organization"}`).join("; ")}`);
      }
      if (existingStory.countries?.length) {
        facts.push(`Countries: ${existingStory.countries.map((c: any) => c.name || c).join(", ")}`);
      }
      if (existingStory.key_numbers?.length) {
        facts.push(`Key numbers: ${existingStory.key_numbers.map((k: any) => `${k.value} (${k.label})`).join(", ")}`);
      }
      if (existingStory.timeline?.length) {
        facts.push(`Timeline: ${existingStory.timeline.join("; ")}`);
      }
      if (existingStory.why_it_matters) facts.push(`Why it matters: ${existingStory.why_it_matters}`);
      if (existingStory.what_happens_next) facts.push(`What happens next: ${existingStory.what_happens_next}`);
      if (existingStory.background) facts.push(`Background: ${existingStory.background}`);
      sourceText = facts.join("\n\n");
    }

    if (wordCount(sourceText) < 80) {
      // Not enough source data — enqueue for retry in case source comes back online
      await enqueueRegenerationFailure({
        articleId: row.id,
        sourceTitle: row.title,
        sourceUrl,
        sourceName,
        category: row.category,
        coverImageUrl: row.cover_image_url,
        errorReason: "Not enough source data to regenerate",
      }).catch(() => {});
      await supabase
        .from("articles")
        .update({ reprocessed_at: new Date().toISOString() })
        .eq("id", row.id);
      failed++;
      return;
    }

    const raw: RawItem = {
      title: row.title,
      description: sourceText,
      url: sourceUrl,
      source: sourceName,
      publishedAt: new Date().toISOString(),
      imageUrl: row.cover_image_url,
      forcedCategory: row.category || undefined,
      allowStoredText: true,
    };
    try {
      const p = await processItem(raw);
      if (!p) {
        await enqueueRegenerationFailure({
          articleId: row.id,
          sourceTitle: row.title,
          sourceUrl,
          sourceName,
          category: row.category,
          coverImageUrl: row.cover_image_url,
          errorReason: "AI generation failed quality checks during reprocess",
        }).catch(() => {});
        failed++;
        return;
      }
      const subject = (p.title || row.title)
        .replace(/[^A-Za-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them)$/i.test(w))
        .slice(0, 6)
        .join(" ");
      // Build entity-based image query from AI-extracted story data
      const reprocessEntities: string[] = [];
      if (p.story?.people?.length) {
        for (const person of p.story.people.slice(0, 2)) {
          if (person.name) reprocessEntities.push(person.name);
        }
      }
      if (p.story?.organizations?.length) {
        for (const org of p.story.organizations.slice(0, 2)) {
          if (org.name && !/reuters|bbc|cnn|associated press|bloomberg/i.test(org.name)) {
            reprocessEntities.push(org.name);
          }
        }
      }
      if (p.story?.countries?.length) {
        for (const country of p.story.countries.slice(0, 2)) {
          if (country.name) reprocessEntities.push(country.name);
        }
      }
      let cover = row.cover_image_url;
      if (!cover || cover.startsWith("data:image")) {
        // Try entity-based query first, then title keywords, then category
        if (reprocessEntities.length >= 1) {
          cover = await pexelsImage(reprocessEntities.join(" ").slice(0, 100), { excludeUrls: existingImages });
        }
        if (!cover && p.tags?.length) {
          cover = await pexelsImage(p.tags.slice(0, 3).join(" "), { excludeUrls: existingImages });
        }
        if (!cover) {
          cover = (await pexelsImage(subject, { excludeUrls: existingImages }))
            || (await pexelsImage(`${p.category || row.category || "news"} ${subject}`.trim(), { excludeUrls: existingImages }))
            || getCategoryFallbackImage(p.category || row.category || "world", `${p.title}-${row.id}`, existingImages);
        }
      }
      // Fetch a relevant video for this article
      let coverVideoUrl: string | null = null;
      try {
        const vid = await pexelsVideo(subject);
        if (vid) coverVideoUrl = vid.videoUrl;
      } catch {}
      p.coverImageUrl = cover;
      const passesGuard = finalPublicationGuard(p, sourceText);
      const { error } = await supabase
        .from("articles")
        .update({
          title: p.title,
          dek: p.dek || null,
          category: p.category || row.category,
          subcategory: p.subcategory || null,
          cover_image_url: cover,
          cover_video_url: coverVideoUrl,
          read_time_minutes: 4,
          sources: [{ name: raw.source || raw.url, url: raw.url }] as unknown as Database["public"]["Tables"]["articles"]["Update"]["sources"],
          story: ({ ...(p.story || {}), sources: [{ name: raw.source || raw.url, url: raw.url }] } as unknown) as Database["public"]["Tables"]["articles"]["Update"]["story"],
          country_code: p.country_code || null,
          is_published: passesGuard,
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

export async function backfillVideos(opts?: { limit?: number }): Promise<{
  attempted: number;
  updated: number;
  failed: number;
  remaining: number;
}> {
  const supabase = adminClient();
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 50);
  const { data: rpcData } = await supabase.rpc("get_articles_missing_video", { p_limit: limit });

  const items = (rpcData ?? []) as Array<{
    id: string;
    title: string;
    category: string | null;
    cover_image_url: string | null;
    cover_video_url: string | null;
  }>;

  let updated = 0;
  let failed = 0;

  await pMap(items, 3, async (row) => {
    try {
      const subject = row.title
        .replace(/[^A-Za-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them|over|more|than|what|when|where|which|while|also|could|would|should|might|must|does|doing|done|made|make|gets|getting|goes|going|come|coming|takes|taking|finds|found|find|reveals|revealed|shows|shown|show|study|report|according|image|photo|getty|reuters|caption|via|advertisement|story|article|read|more|click|subscribe|sign)\b/i.test(w))
        .slice(0, 4)
        .join(" ");

      const query = subject || row.category || "news";
      const vid = await pexelsVideo(query);
      if (vid?.videoUrl) {
        const { error } = await supabase.rpc("update_cover_video_url", {
          p_article_id: row.id,
          p_video_url: vid.videoUrl,
        });
        if (error) {
          failed++;
        } else {
          updated++;
        }
      } else {
        // No video found — try category-based fallback
        const catQuery = row.category || "news";
        const fallbackVid = await pexelsVideo(catQuery);
        if (fallbackVid?.videoUrl) {
          const { error } = await supabase.rpc("update_cover_video_url", {
            p_article_id: row.id,
            p_video_url: fallbackVid.videoUrl,
          });
          if (error) {
            failed++;
          } else {
            updated++;
          }
        } else {
          failed++;
        }
      }
    } catch (e) {
      failed++;
      console.error("[backfill-videos] error:", (e as Error).message);
    }
  });

  const { data: countData } = await supabase.rpc("count_articles_missing_video");
  const count = (countData as number) ?? 0;

  return { attempted: items.length, updated, failed, remaining: count };
}

export async function regenerateArticleBySlug(slug: string): Promise<{
  ok: boolean;
  slug: string;
  title?: string;
  error?: string;
}> {
  const supabase = adminClient();
  const { data: row } = await supabase
    .from("articles")
    .select("id, title, dek, story, sources, category, cover_image_url")
    .eq("slug", slug)
    .single();

  if (!row) return { ok: false, slug, error: "Article not found" };

  const existingStory = row.story || ({} as Processed["story"]);
  const storySources = (row.story as any)?.sources as Array<{ name?: string; url?: string }> | undefined;
  const topLevelSources = row.sources as Array<{ name?: string; url?: string }> | null;
  const sourceEntry = (topLevelSources && topLevelSources.length > 0 ? topLevelSources[0] : null)
    || (storySources && storySources.length > 0 ? storySources[0] : null);
  const sourceUrl = sourceEntry?.url || "";
  const sourceName = sourceEntry?.name || "Archive";

  let sourceText = "";
  if (sourceUrl) {
    sourceText = await fetchArticleFullText(sourceUrl);
  }

  if (!sourceText || sourceText.length < 250) {
    const facts: string[] = [];
    if (row.title) facts.push(`Headline topic: ${row.title}`);
    if (row.dek) facts.push(`Summary: ${row.dek}`);
    if (existingStory.key_developments?.length) {
      facts.push(`Key developments:\n${existingStory.key_developments.map((d) => `- ${d}`).join("\n")}`);
    }
    if (existingStory.quick_insights?.length) {
      facts.push(`Quick insights:\n${existingStory.quick_insights.map((q) => `- ${q}`).join("\n")}`);
    }
    if (existingStory.people?.length) {
      facts.push(`People involved: ${existingStory.people.map((p: any) => `${p.name} (${p.role || "unknown role"})`).join(", ")}`);
    }
    if (existingStory.organizations?.length) {
      facts.push(`Organizations: ${existingStory.organizations.map((o: any) => `${o.name} — ${o.explanation || "organization"}`).join("; ")}`);
    }
    if (existingStory.countries?.length) {
      facts.push(`Countries: ${existingStory.countries.map((c: any) => c.name || c).join(", ")}`);
    }
    if (existingStory.key_numbers?.length) {
      facts.push(`Key numbers: ${existingStory.key_numbers.map((k: any) => `${k.value} (${k.label})`).join(", ")}`);
    }
    if (existingStory.timeline?.length) {
      facts.push(`Timeline: ${existingStory.timeline.join("; ")}`);
    }
    if (existingStory.why_it_matters) facts.push(`Why it matters: ${existingStory.why_it_matters}`);
    if (existingStory.what_happens_next) facts.push(`What happens next: ${existingStory.what_happens_next}`);
    if (existingStory.background) facts.push(`Background: ${existingStory.background}`);
    sourceText = facts.join("\n\n");
  }

  if (wordCount(sourceText) < 80) {
    return { ok: false, slug, error: "Not enough source data to regenerate" };
  }

  const raw: RawItem = {
    title: row.title,
    description: sourceText,
    url: sourceUrl,
    source: sourceName,
    publishedAt: new Date().toISOString(),
    imageUrl: row.cover_image_url,
    forcedCategory: row.category || undefined,
    allowStoredText: true,
  };

  try {
    const p = await processItem(raw);
    if (!p) {
      return { ok: false, slug, error: "AI generation failed quality checks" };
    }

    p.coverImageUrl = row.cover_image_url;
    const passesGuard = finalPublicationGuard(p, sourceText);
    const update: Record<string, unknown> = {
      title: p.title,
      dek: p.dek,
      story: p.story as any,
      content_quality: p.contentQuality,
      is_published: passesGuard,
      reprocessed_at: new Date().toISOString(),
    };
    if (p.coverImageUrl) update.cover_image_url = p.coverImageUrl;

    const { error } = await supabase.from("articles").update(update).eq("id", row.id);
    if (error) {
      return { ok: false, slug, error: error.message };
    }
    return { ok: true, slug, title: p.title };
  } catch (e) {
    return { ok: false, slug, error: (e as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistent Regeneration Retry Queue
//
// When an article rewrite fails (AI credits exhausted, API key invalid, quality
// checks failed after all retries), the failure is enqueued here. The reprocess
// cron/hook drains the queue automatically, retrying with exponential backoff.
// Once credits/keys become valid again, the queue drains naturally.
// ─────────────────────────────────────────────────────────────────────────────

function retryDelay(attempts: number): string {
  // Exponential backoff: 5m, 15m, 30m, 1h, 2h, 4h, 8h, 24h, 24h, 24h
  const delays = [5, 15, 30, 60, 120, 240, 480, 1440, 1440, 1440];
  const minutes = delays[Math.min(attempts, delays.length - 1)];
  return `${minutes} minutes`;
}

export async function enqueueRegenerationFailure(opts: {
  articleId: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceName: string;
  category?: string | null;
  coverImageUrl?: string | null;
  errorReason: string;
}): Promise<void> {
  const supabase = adminClient();
  // Check if already enqueued — if so, increment attempts and update error reason
  const { data: existing } = await supabase
    .from("regeneration_queue")
    .select("id, attempts, max_attempts, status")
    .eq("article_id", opts.articleId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "done" || existing.status === "exhausted") return;
    const newAttempts = (existing.attempts || 0) + 1;
    const newStatus = newAttempts >= (existing.max_attempts || 10) ? "exhausted" : "pending";
    await supabase
      .from("regeneration_queue")
      .update({
        attempts: newAttempts,
        error_reason: opts.errorReason,
        status: newStatus,
        next_retry_at: newStatus === "exhausted" ? null : new Date(Date.now() + parseDelay(retryDelay(newAttempts))).toISOString(),
        last_attempted_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("regeneration_queue")
      .insert({
        article_id: opts.articleId,
        source_title: opts.sourceTitle,
        source_url: opts.sourceUrl,
        source_name: opts.sourceName,
        category: opts.category || null,
        cover_image_url: opts.coverImageUrl || null,
        error_reason: opts.errorReason,
        attempts: 1,
        max_attempts: 10,
        status: "pending",
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        last_attempted_at: new Date().toISOString(),
      });
  }
}

function parseDelay(delay: string): number {
  const match = delay.match(/(\d+)\s*minutes/);
  if (match) return parseInt(match[1], 10) * 60 * 1000;
  return 5 * 60 * 1000;
}

export async function drainRegenerationQueue(opts?: { limit?: number }): Promise<{
  attempted: number;
  updated: number;
  failed: number;
  exhausted: number;
  remaining: number;
}> {
  const supabase = adminClient();
  const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 50);

  // Select pending items whose next_retry_at has passed
  const { data: queueItems } = await supabase
    .from("regeneration_queue")
    .select("id, article_id, source_title, source_url, source_name, category, cover_image_url, attempts, max_attempts")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  const items = (queueItems ?? []) as Array<{
    id: string;
    article_id: string;
    source_title: string;
    source_url: string;
    source_name: string;
    category: string | null;
    cover_image_url: string | null;
    attempts: number;
    max_attempts: number;
  }>;

  if (!items.length) return { attempted: 0, updated: 0, failed: 0, exhausted: 0, remaining: 0 };

  // Mark as in_progress
  for (const item of items) {
    await supabase
      .from("regeneration_queue")
      .update({ status: "in_progress", last_attempted_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  let updated = 0;
  let failed = 0;
  let exhausted = 0;

  // Fetch all existing cover images to avoid duplicates
  const { data: existingImgRows } = await supabase
    .from("articles")
    .select("cover_image_url")
    .not("cover_image_url", "is", null)
    .limit(5000);
  const existingImages = new Set<string>(((existingImgRows ?? []) as { cover_image_url: string | null }[]).map((r) => r.cover_image_url).filter(Boolean) as string[]);

  await pMap(items, 3, async (item) => {
    // Fetch source text
    let sourceText = "";
    if (item.source_url) {
      sourceText = await fetchArticleFullText(item.source_url);
    }

    // If source URL is unreachable, build facts from existing article
    if (!sourceText || sourceText.length < 250) {
      const { data: article } = await supabase
        .from("articles")
        .select("title, dek, story")
        .eq("id", item.article_id)
        .maybeSingle();

      if (article) {
        const existingStory = (article as any).story || {};
        const facts: string[] = [];
        if ((article as any).title) facts.push(`Headline topic: ${(article as any).title}`);
        if ((article as any).dek) facts.push(`Summary: ${(article as any).dek}`);
        if (existingStory.key_developments?.length) {
          facts.push(`Key developments:\n${existingStory.key_developments.map((d: string) => `- ${d}`).join("\n")}`);
        }
        if (existingStory.quick_insights?.length) {
          facts.push(`Quick insights:\n${existingStory.quick_insights.map((q: string) => `- ${q}`).join("\n")}`);
        }
        if (existingStory.people?.length) {
          facts.push(`People involved: ${existingStory.people.map((p: any) => `${p.name} (${p.role || "unknown role"})`).join(", ")}`);
        }
        if (existingStory.organizations?.length) {
          facts.push(`Organizations: ${existingStory.organizations.map((o: any) => `${o.name} — ${o.explanation || "organization"}`).join("; ")}`);
        }
        if (existingStory.countries?.length) {
          facts.push(`Countries: ${existingStory.countries.map((c: any) => c.name || c).join(", ")}`);
        }
        if (existingStory.key_numbers?.length) {
          facts.push(`Key numbers: ${existingStory.key_numbers.map((k: any) => `${k.value} (${k.label})`).join(", ")}`);
        }
        if (existingStory.why_it_matters) facts.push(`Why it matters: ${existingStory.why_it_matters}`);
        if (existingStory.background) facts.push(`Background: ${existingStory.background}`);
        sourceText = facts.join("\n\n");
      }
    }

    if (wordCount(sourceText) < 80) {
      // Not enough data — mark exhausted
      await supabase
        .from("regeneration_queue")
        .update({ status: "exhausted", error_reason: "Not enough source data" })
        .eq("id", item.id);
      exhausted++;
      return;
    }

    const raw: RawItem = {
      title: item.source_title,
      description: sourceText,
      url: item.source_url,
      source: item.source_name,
      publishedAt: new Date().toISOString(),
      imageUrl: item.cover_image_url,
      forcedCategory: item.category || undefined,
      allowStoredText: true,
    };

    try {
      const p = await processItem(raw);
      if (!p) {
        // Still failing — increment attempts and schedule next retry
        const newAttempts = item.attempts + 1;
        const isExhausted = newAttempts >= item.max_attempts;
        await supabase
          .from("regeneration_queue")
          .update({
            attempts: newAttempts,
            status: isExhausted ? "exhausted" : "pending",
            error_reason: "AI generation still failing",
            next_retry_at: isExhausted ? null : new Date(Date.now() + parseDelay(retryDelay(newAttempts))).toISOString(),
          })
          .eq("id", item.id);
        if (isExhausted) exhausted++;
        else failed++;
        return;
      }

      // Success — update the article and mark queue item as done
      const subject = (p.title || item.source_title)
        .replace(/[^A-Za-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !/^(the|and|for|from|with|after|about|into|amid|says|will|been|have|this|that|their|them)$/i.test(w))
        .slice(0, 6)
        .join(" ");
      let cover = item.cover_image_url;
      if (!cover || cover.startsWith("data:image")) {
        cover = (await pexelsImage(subject, { excludeUrls: existingImages }))
          || (await pexelsImage(`${p.category || item.category || "news"} ${subject}`.trim(), { excludeUrls: existingImages }))
          || getCategoryFallbackImage(p.category || item.category || "world", `${p.title}-${item.article_id}`, existingImages);
      }

      p.coverImageUrl = cover;
      const passesGuard = finalPublicationGuard(p, sourceText);
      const { error: updateError } = await supabase
        .from("articles")
        .update({
          title: p.title,
          dek: p.dek || null,
          category: p.category || item.category,
          cover_image_url: cover,
          read_time_minutes: 4,
          story: ({ ...(p.story || {}), sources: [{ name: item.source_name || item.source_url, url: item.source_url }] } as any),
          is_published: passesGuard,
          reprocessed_at: new Date().toISOString(),
        })
        .eq("id", item.article_id);

      if (updateError) {
        const newAttempts = item.attempts + 1;
        const isExhausted = newAttempts >= item.max_attempts;
        await supabase
          .from("regeneration_queue")
          .update({
            attempts: newAttempts,
            status: isExhausted ? "exhausted" : "pending",
            error_reason: updateError.message,
            next_retry_at: isExhausted ? null : new Date(Date.now() + parseDelay(retryDelay(newAttempts))).toISOString(),
          })
          .eq("id", item.id);
        if (isExhausted) exhausted++;
        else failed++;
      } else {
        await supabase
          .from("regeneration_queue")
          .update({ status: "done", error_reason: null })
          .eq("id", item.id);
        updated++;
      }
    } catch (e) {
      const newAttempts = item.attempts + 1;
      const isExhausted = newAttempts >= item.max_attempts;
      await supabase
        .from("regeneration_queue")
        .update({
          attempts: newAttempts,
          status: isExhausted ? "exhausted" : "pending",
          error_reason: (e as Error).message,
          next_retry_at: isExhausted ? null : new Date(Date.now() + parseDelay(retryDelay(newAttempts))).toISOString(),
        })
        .eq("id", item.id);
      if (isExhausted) exhausted++;
      else failed++;
    }
  });

  const { count } = await supabase
    .from("regeneration_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return { attempted: items.length, updated, failed, exhausted, remaining: count ?? 0 };
}

