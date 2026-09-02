import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { ArticleSummary } from "./types";

// EXACT same pattern as articles.functions.ts — no try/catch swallowing,
// no dynamic import.meta access that Vite can't statically replace.
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

function publicClient() {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

// EXACT same column list as articles.functions.ts listArticles — must match or query fails
const SUMMARY_COLS =
  "id,slug,title,dek,category,subcategory,cover_image_url,read_time_minutes,country_code,featured_slot,published_at,created_at,view_count,like_count,bookmark_count,comment_count";

export type MarketSnap = {
  symbol: string;
  name: string;
  category: string;
  region: string | null;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  available: boolean;
};

export type EpaperPage = {
  pageNumber: number;
  sectionId: string;
  sectionLabel: string;
  sectionKicker: string;
  isFrontPage: boolean;
  isBackPage: boolean;
  articles: ArticleSummary[];
  heroArticle: ArticleSummary | null;
};

export type WordOfDay = {
  word: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  meaning: string | null;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
};

export type EpaperData = {
  date: string;
  dateDisplay: string;
  editionNumber: number;
  totalArticles: number;
  totalPages: number;
  pages: EpaperPage[];
  topStories: ArticleSummary[];
  editorsPicks: ArticleSummary[];
  breakingNews: ArticleSummary[];
  trendingStories: ArticleSummary[];
  marketSnapshot: MarketSnap[];
  quoteOfDay: { text: string; author: string };
  thisDayHistory: string[];
  photoOfDay: { url: string; caption: string; credit: string };
  weather: { temp: string; condition: string; location: string };
  wordOfDay: WordOfDay;
};

export type ArchiveEntry = {
  date: string;
  dateDisplay: string;
  editionNumber: number;
  totalArticles: number;
  totalPages: number;
  coverImage: string | null;
  coverTitle: string;
};

const SECTION_MAP: { id: string; label: string; kicker: string; cats: string[] }[] = [
  { id: "world", label: "World", kicker: "Planet Earth", cats: ["world", "world-discovery", "global-affairs", "geopolitics", "politics", "government", "diplomacy", "international-relations", "public-policy", "elections"] },
  { id: "india", label: "India", kicker: "The Nation", cats: ["india", "indian-innovation", "indian-startups", "indian-history", "indian-culture", "indian-science", "indian-wildlife", "indian-discoveries"] },
  { id: "business", label: "Business & Economy", kicker: "Money & Markets", cats: ["business", "markets", "economics", "investing", "success-stories", "entrepreneurs", "startups", "business-leaders", "personal-finance", "wealth-creation", "billionaires", "electric-vehicles"] },
  { id: "technology", label: "Technology", kicker: "Innovation", cats: ["technology", "future-technology", "innovation", "digital-transformation", "hardware", "software"] },
  { id: "ai", label: "Artificial Intelligence", kicker: "The AI Revolution", cats: ["artificial-intelligence", "future-of-ai", "robotics", "quantum-computing"] },
  { id: "science", label: "Science", kicker: "Discovery", cats: ["science", "physics", "chemistry", "biology", "genetics", "neuroscience", "medicine", "research", "scientific-discoveries", "breakthroughs"] },
  { id: "space", label: "Space", kicker: "The Universe", cats: ["space", "astronomy", "cosmology", "space-missions", "exoplanets", "black-holes", "future-space-exploration", "rocket-science"] },
  { id: "climate", label: "Climate", kicker: "A Changing Planet", cats: ["climate", "sustainability", "green-technology", "environmental-protection"] },
  { id: "environment", label: "Environment", kicker: "Earth Chronicle", cats: ["environment", "environmental-protection", "conservation", "biodiversity", "forests", "national-parks"] },
  { id: "wildlife", label: "Wildlife", kicker: "The Animal Kingdom", cats: ["wildlife", "nature", "endangered-species", "animal-kingdom", "marine-life"] },
  { id: "oceans", label: "Oceans", kicker: "The Deep Blue", cats: ["ocean-exploration", "deep-sea-mysteries", "marine-science", "underwater-discoveries", "coral-reefs", "ocean-wildlife"] },
  { id: "history", label: "History", kicker: "The Past Revisited", cats: ["history", "ancient-civilizations", "ancient-india", "ancient-egypt", "ancient-rome", "historical-figures"] },
  { id: "archaeology", label: "Archaeology", kicker: "Unearthing the Past", cats: ["archaeology", "historical-mysteries"] },
  { id: "mysteries", label: "Mysteries", kicker: "Unsolved & Enigmatic", cats: ["unsolved-mysteries", "lost-civilizations", "ancient-secrets", "strange-phenomena", "historical-enigmas", "curiosity-stories"] },
  { id: "education", label: "Education", kicker: "Learning & Growth", cats: ["education", "learning", "study-skills", "scholarships", "exams"] },
  { id: "careers", label: "Careers", kicker: "Work & Opportunity", cats: ["careers", "jobs", "government-jobs", "internships", "fellowships", "skill-development", "future-of-work"] },
  { id: "health", label: "Health", kicker: "Living Well", cats: ["health", "fitness", "nutrition", "longevity", "medical-innovation", "wellness"] },
  { id: "psychology", label: "Psychology", kicker: "The Human Mind", cats: ["psychology", "human-behavior", "society", "relationships", "philosophy", "ethics"] },
  { id: "food", label: "Food", kicker: "Culinary Culture", cats: ["food-culinary-culture", "world-foods", "indian-foods", "traditional-recipes", "food-science", "rare-foods", "culinary-history"] },
  { id: "travel", label: "Travel", kicker: "Destinations & Adventure", cats: ["travel", "adventure", "exploration", "amazing-places", "hidden-places", "luxury-travel", "natural-wonders"] },
  { id: "culture", label: "Culture", kicker: "Arts & Heritage", cats: ["culture", "art", "photography", "architecture", "museums", "heritage", "languages"] },
  { id: "books", label: "Books", kicker: "The Literary World", cats: ["books", "book-summaries", "authors", "literature", "classic-books", "modern-books", "reading-lists"] },
  { id: "movies", label: "Movies", kicker: "Cinema", cats: ["movies", "entertainment", "celebrities"] },
  { id: "tv", label: "TV & Streaming", kicker: "The Small Screen", cats: ["web-series", "streaming", "internet-culture", "pop-culture"] },
  { id: "music", label: "Music", kicker: "Sound & Rhythm", cats: ["music"] },
  { id: "gaming", label: "Gaming", kicker: "Interactive Entertainment", cats: ["gaming", "esports"] },
  { id: "sports", label: "Sports Headlines", kicker: "The Game", cats: ["sport", "sports", "cricket", "football", "olympics", "athletes", "sports-science", "major-events", "basketball", "tennis", "golf", "hockey", "badminton", "motorsport"] },
  { id: "cricket", label: "Cricket", kicker: "The Gentleman's Game", cats: ["cricket"] },
  { id: "football", label: "Football", kicker: "The Beautiful Game", cats: ["football"] },
  { id: "astronomy", label: "Astronomy Tonight", kicker: "The Night Sky", cats: ["astronomy", "cosmology"] },
];

const QUOTES = [
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
  { text: "The universe is not only queerer than we suppose, but queerer than we can suppose.", author: "J.B.S. Haldane" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "The greatest discovery of all time is that a person can change their future by merely changing their attitude.", author: "Oprah Winfrey" },
  { text: "What we know is a drop, what we don't know is an ocean.", author: "Isaac Newton" },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein" },
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
];

const HISTORY_FACTS = [
  "In 1958, NASA was created, marking the beginning of the space age.",
  "In 1969, Apollo 11 landed humans on the Moon for the first time.",
  "In 1989, the World Wide Web was invented, revolutionizing communication.",
  "In 2001, Wikipedia was launched, democratizing knowledge access.",
  "In 2007, the iPhone was introduced, reshaping mobile technology.",
  "In 2012, the Higgs boson particle was discovered at CERN.",
  "In 2015, gravitational waves were detected, confirming Einstein's prediction.",
  "In 2019, the first image of a black hole was captured.",
  "In 1453, the Gutenberg Bible was printed, revolutionizing knowledge.",
  "In 1492, Columbus reached the Americas, changing world history.",
  "In 1687, Newton published Principia Mathematica, defining physics.",
  "In 1859, Darwin published On the Origin of Species.",
  "In 1903, the Wright Brothers achieved the first powered flight.",
  "In 1945, the United Nations was founded after World War II.",
  "In 1969, ARPANET was created, the precursor to the internet.",
];

const WEATHER_OPTIONS = [
  { temp: "28°C", condition: "Partly Cloudy", location: "Global Edition" },
  { temp: "22°C", condition: "Clear Skies", location: "Global Edition" },
  { temp: "31°C", condition: "Sunny", location: "Global Edition" },
  { temp: "19°C", condition: "Light Rain", location: "Global Edition" },
  { temp: "25°C", condition: "Misty Morning", location: "Global Edition" },
];

const WORD_FALLBACK: WordOfDay = {
  word: "curiosity",
  pronunciation: "/ˌkjʊərɪˈɒsɪti/",
  part_of_speech: "noun",
  meaning: "A strong desire to learn or know something; inquisitiveness.",
  example: "Her curiosity about the natural world led her to become a scientist.",
  synonyms: ["inquisitiveness", "interest", "eagerness", "wonder"],
  antonyms: ["indifference", "apathy", "boredom"],
};

function pickDaily<T>(arr: T[], dateKey: string): T {
  const seed = dateKey.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
  return arr[seed % arr.length];
}

function formatFixedDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${weekdays[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function dateToNumber(dateStr: string): number {
  const epoch = new Date("2025-01-01").getTime();
  const target = new Date(dateStr).getTime();
  return Math.floor((target - epoch) / 86400000) + 1;
}

function buildPages(
  articles: ArticleSummary[],
  topStories: ArticleSummary[],
  editorsPicks: ArticleSummary[],
  breakingNews: ArticleSummary[],
  trendingStories: ArticleSummary[],
): EpaperPage[] {
  const pages: EpaperPage[] = [];
  const usedIds = new Set<string>();

  // Page 1: Front Page
  pages.push({
    pageNumber: 1,
    sectionId: "front",
    sectionLabel: "Front Page",
    sectionKicker: "The Daily Discovery Edition",
    isFrontPage: true,
    isBackPage: false,
    articles: topStories.slice(0, 10),
    heroArticle: topStories[0] ?? null,
  });
  topStories.slice(0, 5).forEach((a) => usedIds.add(a.id));
  editorsPicks.forEach((a) => usedIds.add(a.id));

  // Page 2: Editor's Picks & Breaking News
  if (editorsPicks.length > 0 || breakingNews.length > 0) {
    const pageArticles = [...breakingNews, ...editorsPicks].filter((a) => !usedIds.has(a.id));
    pageArticles.forEach((a) => usedIds.add(a.id));
    pages.push({
      pageNumber: 2,
      sectionId: "editors",
      sectionLabel: "Editor's Picks & Breaking",
      sectionKicker: "Curated by The United Hell",
      isFrontPage: false,
      isBackPage: false,
      articles: pageArticles,
      heroArticle: pageArticles[0] ?? null,
    });
  }

  // Page 3: Trending
  if (trendingStories.length > 0) {
    const trendingArticles = trendingStories.filter((a) => !usedIds.has(a.id));
    trendingArticles.forEach((a) => usedIds.add(a.id));
    if (trendingArticles.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        sectionId: "trending",
        sectionLabel: "Trending Now",
        sectionKicker: "What the World is Reading",
        isFrontPage: false,
        isBackPage: false,
        articles: trendingArticles,
        heroArticle: trendingArticles[0] ?? null,
      });
    }
  }

  // Section pages — dynamically generate as many as needed
  for (const sec of SECTION_MAP) {
    const secArticles = articles.filter(
      (a) => sec.cats.includes(a.category) && !usedIds.has(a.id),
    );
    if (secArticles.length === 0) continue;

    const chunks: ArticleSummary[][] = [];
    for (let i = 0; i < secArticles.length; i += 8) {
      chunks.push(secArticles.slice(i, i + 8));
    }

    chunks.forEach((chunk, chunkIdx) => {
      chunk.forEach((a) => usedIds.add(a.id));
      const pageLabel = chunks.length > 1 ? `${sec.label} ${chunkIdx + 1}` : sec.label;
      pages.push({
        pageNumber: pages.length + 1,
        sectionId: sec.id + (chunkIdx > 0 ? `-${chunkIdx + 1}` : ""),
        sectionLabel: pageLabel,
        sectionKicker: sec.kicker,
        isFrontPage: false,
        isBackPage: false,
        articles: chunk,
        heroArticle: chunk[0] ?? null,
      });
    });
  }

  // Unmapped categories — never leave articles behind
  const mappedCats = new Set(SECTION_MAP.flatMap((s) => s.cats));
  const unmappedByCat = new Map<string, ArticleSummary[]>();
  for (const a of articles) {
    if (usedIds.has(a.id) || mappedCats.has(a.category)) continue;
    if (!unmappedByCat.has(a.category)) unmappedByCat.set(a.category, []);
    unmappedByCat.get(a.category)!.push(a);
  }
  for (const [cat, catArticles] of unmappedByCat) {
    const label = cat
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const chunks: ArticleSummary[][] = [];
    for (let i = 0; i < catArticles.length; i += 8) {
      chunks.push(catArticles.slice(i, i + 8));
    }
    chunks.forEach((chunk, chunkIdx) => {
      chunk.forEach((a) => usedIds.add(a.id));
      const pageLabel = chunks.length > 1 ? `${label} ${chunkIdx + 1}` : label;
      pages.push({
        pageNumber: pages.length + 1,
        sectionId: cat + (chunkIdx > 0 ? `-${chunkIdx + 1}` : ""),
        sectionLabel: pageLabel,
        sectionKicker: "More Stories",
        isFrontPage: false,
        isBackPage: false,
        articles: chunk,
        heroArticle: chunk[0] ?? null,
      });
    });
  }

  // Back Page
  const remaining = articles.filter((a) => !usedIds.has(a.id));
  if (remaining.length > 0 || pages.length > 0) {
    const backPageArticles = (remaining.length > 0 ? remaining : editorsPicks).slice(0, 6);
    pages.push({
      pageNumber: pages.length + 1,
      sectionId: "back",
      sectionLabel: "Back Page",
      sectionKicker: "More to Explore",
      isFrontPage: false,
      isBackPage: true,
      articles: backPageArticles,
      heroArticle: backPageArticles[0] ?? null,
    });
  }

  return pages;
}

export const getEpaperData = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const inputDate = data?.date;
    const today = new Date();
    const dateStr = inputDate || today.toISOString().slice(0, 10);
    const dateDisplay = formatFixedDate(dateStr);
    const editionNumber = dateToNumber(dateStr);

    const supabase = publicClient();

    // Single query — 459 articles fits in one request. No loop needed.
    let query = supabase
      .from("articles")
      .select(SUMMARY_COLS)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000);

    if (inputDate) {
      const startDate = new Date(dateStr + "T00:00:00").toISOString();
      const endDate = new Date(dateStr + "T23:59:59").toISOString();
      query = query.gte("published_at", startDate).lte("published_at", endDate);
    }

    // Run all queries in parallel for speed
    const [articlesResult, marketResult, vocabResult] = await Promise.all([
      query,
      supabase.from("market_prices").select("symbol,name,category,region,price,change,change_percent,available").order("symbol", { ascending: true }),
      (async () => {
        const seed = dateStr.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
        return supabase.from("vocabulary_cache").select("word,part_of_speech,meaning,example,synonyms,antonyms,pronunciation").order("search_count", { ascending: false, nullsFirst: false }).range(seed % 200, (seed % 200) + 1);
      })(),
    ]);

    if (articlesResult.error) throw new Error(`Epaper article query failed: ${articlesResult.error.message}`);

    const seen = new Set<string>();
    const articles: ArticleSummary[] = [];
    for (const row of (articlesResult.data ?? []) as unknown as ArticleSummary[]) {
      if (!row.id || seen.has(row.id)) continue;
      seen.add(row.id);
      articles.push(row);
    }

    // Sort by trending_score (falls back to composite engagement score)
    const compositeScore = (a: ArticleSummary) =>
      (a.trending_score ?? 0) * 10 +
      (a.view_count ?? 0) +
      (a.like_count ?? 0) * 5 +
      (a.bookmark_count ?? 0) * 4 +
      (a.comment_count ?? 0) * 3;

    const topStories = [...articles]
      .sort((a, b) => compositeScore(b) - compositeScore(a))
      .slice(0, 10);
    const editorsPicks = [...articles]
      .sort((a, b) => compositeScore(b) - compositeScore(a))
      .slice(0, 5);
    const breakingNews = articles.filter((a) => a.category === "breaking-news").slice(0, 5);
    const trendingStories = [...articles]
      .sort((a, b) => compositeScore(b) - compositeScore(a))
      .slice(0, 8);

    const pages = buildPages(articles, topStories, editorsPicks, breakingNews, trendingStories);

    // Market snapshot from parallel query result
    let marketSnapshot: MarketSnap[] = [];
    try {
      if (marketResult.data && marketResult.data.length > 0) {
        marketSnapshot = (marketResult.data as any[]).slice(0, 8).map((r) => ({
          symbol: r.symbol ?? "",
          name: r.name ?? r.symbol ?? "",
          category: r.category ?? "",
          region: r.region ?? null,
          price: r.price ?? null,
          change: r.change ?? null,
          change_percent: r.change_percent ?? null,
          available: r.available ?? true,
        }));
      }
    } catch (err) {
      console.error("[epaper] market snapshot error:", err);
    }

    const quoteOfDay = pickDaily(QUOTES, dateStr);
    const thisDayHistory = [pickDaily(HISTORY_FACTS, dateStr)];
    const weather = pickDaily(WEATHER_OPTIONS, dateStr);
    const photoArticle = articles.find((a) => a.cover_image_url);
    const photoOfDay = {
      url: photoArticle?.cover_image_url ?? "",
      caption: photoArticle?.title ?? "Today's featured image",
      credit: "The United Hell",
    };

    // Word of the Day from parallel query result
    let wordOfDay: WordOfDay = WORD_FALLBACK;
    try {
      if (vocabResult.data && vocabResult.data.length > 0) {
        const v = vocabResult.data[0] as any;
        wordOfDay = {
          word: v.word ?? "curiosity",
          pronunciation: v.pronunciation ?? null,
          part_of_speech: v.part_of_speech ?? null,
          meaning: v.meaning ?? null,
          example: v.example ?? null,
          synonyms: Array.isArray(v.synonyms) ? v.synonyms : [],
          antonyms: Array.isArray(v.antonyms) ? v.antonyms : [],
        };
      }
    } catch (err) {
      console.error("[epaper] word of day error:", err);
    }

    return {
      date: dateStr,
      dateDisplay,
      editionNumber,
      totalArticles: articles.length,
      totalPages: pages.length,
      pages,
      topStories,
      editorsPicks,
      breakingNews,
      trendingStories,
      marketSnapshot,
      quoteOfDay,
      thisDayHistory,
      photoOfDay,
      weather,
      wordOfDay,
    } as EpaperData;
  });

export const getArchiveList = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data: rows, error } = await supabase
    .from("articles")
    .select("published_at,cover_image_url,title,category")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(500);

  if (error || !rows || rows.length === 0) return [];

  const byDate = new Map<string, { articles: typeof rows; cover: typeof rows[0] | null }>();
  for (const row of rows) {
    const date = (row.published_at as string).slice(0, 10);
    if (!byDate.has(date)) {
      byDate.set(date, { articles: [], cover: null });
    }
    const entry = byDate.get(date)!;
    entry.articles.push(row);
    if (!entry.cover && row.cover_image_url) {
      entry.cover = row;
    }
  }

  const entries: ArchiveEntry[] = [];
  for (const [date, info] of byDate) {
    const dateDisplay = formatFixedDate(date);
    const totalPages = Math.max(2, Math.ceil(info.articles.length / 8) + 2);
    entries.push({
      date,
      dateDisplay,
      editionNumber: dateToNumber(date),
      totalArticles: info.articles.length,
      totalPages,
      coverImage: info.cover?.cover_image_url ?? null,
      coverTitle: info.cover?.title ?? info.articles[0]?.title ?? "Edition Available",
    });
  }

  return entries.slice(0, 60);
});
