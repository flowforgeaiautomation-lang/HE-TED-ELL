import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, ArrowUp, Search, X, Volume2, Clock, Tag, ChevronRight, Lightbulb, TrendingUp, Heart, Bookmark, Share2, MessageCircle, HelpCircle, Headphones, LayoutGrid, Rows3, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listArticles, getBriefingToday } from "@/lib/articles.functions";
import { ArticleActions } from "@/components/article-actions";
import { WordSearch } from "@/components/word-search";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SmartImage } from "@/components/SmartImage";
import { fallbackCoverUrl } from "@/lib/article-images";
import { categoryLabel } from "@/lib/categories";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import type { ArticleSummary, ArticleStory } from "@/lib/types";
import { useServerFn } from "@tanstack/react-start";
import { searchWord } from "@/lib/word-search.functions";
import type { VocabEntry } from "@/lib/types";
import { PageEndAd } from "@/components/ads/EzoicAd";

const PAGE_SIZE = 12;

const briefingQuery = queryOptions({
  queryKey: ["briefing-intro"],
  queryFn: () => getBriefingToday(),
  staleTime: 60_000,
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function relativeTime(dateStr: string): string {
  return formatDate(dateStr);
}

export const Route = createFileRoute("/briefing")({
  head: () => ({
    meta: [
      { title: "Daily Brief — The United Hell" },
      { name: "description", content: "Your daily news brief — swipe through today's most important stories, each with key facts, sources, and context." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Daily Brief — The United Hell" },
      { property: "og:description", content: "Swipe through today's most important stories in a clean, infinite card feed." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/briefing") },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Daily Brief — The United Hell" },
      { name: "twitter:description", content: "Swipe through today's most important stories." },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/briefing") }],
  }),
  loader: async ({ context }) => {
    try {
      await context.queryClient.prefetchQuery(briefingQuery);
    } catch {}
  },
  component: BriefingPage,
  errorComponent: () => (
    <div className="container-read py-20">
      <p className="dek">We couldn't load published stories right now. Please try again.</p>
    </div>
  ),
  notFoundComponent: () => null,
});

function BriefingPage() {
  const { data: briefing } = useQuery(briefingQuery);
  const dateStr = briefing ? formatDate(briefing.briefing_date) : "Latest published stories";

  type ViewMode = "swipe" | "cards" | "classic";
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "swipe";
    return (localStorage.getItem("briefing-view") as ViewMode) || "swipe";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("briefing-view", viewMode);
  }, [viewMode]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const articlesQuery = useQuery(
    queryOptions({
      queryKey: ["briefing-feed"],
      queryFn: () => listArticles({ data: { limit: PAGE_SIZE, sort: "recent" } }),
      staleTime: 30_000,
    }),
  );

  useEffect(() => {
    const result = articlesQuery.data as any;
    if (!result) return;
    const items = (result.items ?? []) as ArticleSummary[];
    setArticles(items);
    offsetRef.current = items.length;
    setHasMore(result.hasMore ?? items.length === PAGE_SIZE);
  }, [articlesQuery.data]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const result: any = await listArticles({
        data: { limit: PAGE_SIZE, offset: offsetRef.current, sort: "recent" },
      });
      const newItems = (result.items ?? []) as ArticleSummary[];
      if (newItems.length > 0) {
        setArticles((prev) => {
          const ids = new Set(prev.map((a) => a.id));
          return [...prev, ...newItems.filter((a) => !ids.has(a.id))];
        });
        offsetRef.current += newItems.length;
      }
      setHasMore(result.hasMore ?? false);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loadingMore, hasMore]);

  const showEmpty =
    articles.length === 0 &&
    !articlesQuery.isLoading &&
    !articlesQuery.isError &&
    articlesQuery.isFetched;

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky header — centered, compact */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b rule">
        <div className="container-edit py-3 flex items-center justify-between gap-4">
          {/* Left: All Stories link */}
          <Link
            to="/today"
            className="hidden sm:inline-flex items-center gap-1.5 border border-foreground px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-full shrink-0"
          >
            All Stories
            <ChevronRight className="h-3 w-3" />
          </Link>

          {/* Center: Date + heading */}
          <div className="flex-1 text-center">
            <div className="kicker text-[0.65rem] leading-none">{dateStr}</div>
            <h1 className="font-serif text-xl md:text-2xl font-bold leading-tight mt-0.5">Daily Briefing</h1>
          </div>

          {/* Right: View selector + All Stories (mobile) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 border rule rounded-full p-0.5">
              <button
                onClick={() => setViewMode("swipe")}
                aria-label="Swipe view"
                aria-pressed={viewMode === "swipe"}
                className={`p-1.5 rounded-full transition ${viewMode === "swipe" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                title="Swipe"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                aria-label="Story cards view"
                aria-pressed={viewMode === "cards"}
                className={`p-1.5 rounded-full transition ${viewMode === "cards" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                title="Story Cards"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("classic")}
                aria-label="Classic briefing view"
                aria-pressed={viewMode === "classic"}
                className={`p-1.5 rounded-full transition ${viewMode === "classic" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                title="Classic"
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Link
              to="/today"
              className="hidden sm:inline-flex items-center gap-1.5 border border-foreground px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-full shrink-0"
            >
              All Stories
              <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              to="/today"
              className="sm:hidden inline-flex items-center gap-1.5 border border-foreground px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-full shrink-0"
            >
              All
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Mobile view selector row */}
        <div className="sm:hidden flex items-center justify-center gap-1 border-t rule py-2">
          <div className="flex items-center gap-1 border rule rounded-full p-0.5">
            <button
              onClick={() => setViewMode("swipe")}
              aria-label="Swipe view"
              aria-pressed={viewMode === "swipe"}
              className={`p-1.5 rounded-full transition ${viewMode === "swipe" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              aria-label="Story cards view"
              aria-pressed={viewMode === "cards"}
              className={`p-1.5 rounded-full transition ${viewMode === "cards" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("classic")}
              aria-label="Classic briefing view"
              aria-pressed={viewMode === "classic"}
              className={`p-1.5 rounded-full transition ${viewMode === "classic" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {briefing?.intro && viewMode !== "swipe" && (
        <div className="container-edit pt-8 pb-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
              <Lightbulb className="h-3.5 w-3.5" />
              Editor's Note
            </div>
            <p className="text-lg leading-relaxed text-foreground/90 font-serif">
              {briefing.intro}
            </p>
          </div>
        </div>
      )}

      {/* Full-page touch swipe feed */}
      <div className={viewMode === "swipe" ? "w-full pt-0" : "container-edit pt-4"}>
        {articlesQuery.isLoading && articles.length === 0 && (
          <div className={viewMode === "swipe" ? "space-y-6" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              viewMode === "swipe" ? (
                <div key={i} className="rounded-2xl border rule overflow-hidden animate-pulse">
                  <div className="aspect-[16/9] bg-muted/40" />
                  <div className="p-6 md:p-8 space-y-3">
                    <div className="h-4 w-24 bg-muted/40 rounded" />
                    <div className="h-7 w-3/4 bg-muted/40 rounded" />
                    <div className="h-4 w-full bg-muted/30 rounded" />
                    <div className="h-4 w-5/6 bg-muted/30 rounded" />
                  </div>
                </div>
              ) : (
                <StoryCardSkeleton key={i} />
              )
            ))}
          </div>
        )}

        {articlesQuery.isError && articles.length === 0 && (
          <div className="text-center py-20">
            <p className="dek">We couldn't load today's brief. Please try again.</p>
            <button
              onClick={() => articlesQuery.refetch()}
              className="mt-4 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-full"
            >
              Retry
            </button>
          </div>
        )}

        {showEmpty && (
          <div className="text-center py-20">
            <p className="dek">No published stories are available yet.</p>
            <Link
              to="/today"
              className="mt-4 inline-flex border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-full"
            >
              Browse all stories
            </Link>
          </div>
        )}

        {viewMode === "cards" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {articles.map((article, i) => (
                <StoryCard key={article.id} article={article} index={i} />
              ))}
            </AnimatePresence>
          </div>
        ) : viewMode === "swipe" ? (
          <SwipeView articles={articles} hasMore={hasMore} loadingMore={loadingMore} loadMore={loadMore} />
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {articles.map((article, i) => (
                <BriefCard key={article.id} article={article} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {viewMode !== "swipe" && <div ref={sentinelRef} className="h-2" />}

        {viewMode !== "swipe" && loadingMore && (
          <div className={viewMode === "cards" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6" : "flex justify-center py-10"}>
            {viewMode === "cards" ? (
              <>
                <StoryCardSkeleton />
                <StoryCardSkeleton />
                <StoryCardSkeleton />
              </>
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {viewMode !== "swipe" && !hasMore && articles.length > 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="mt-4 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-full"
            >
              <ArrowUp className="h-3.5 w-3.5" /> Back to top
            </button>
          </div>
        )}
      </div>

      {viewMode !== "swipe" && <ScrollToTop />}
      {viewMode !== "swipe" && <PageEndAd />}
    </div>
  );
}

function BriefCard({ article, index }: { article: ArticleSummary; index: number }) {
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  const publishedDate = article.published_at
    ? relativeTime(article.published_at)
    : article.created_at
      ? relativeTime(article.created_at)
      : "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
      className="group relative overflow-hidden rounded-2xl border rule bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-xl hover:bg-card/80 hover:-translate-y-0.5"
    >
      <Link to="/article/$slug" params={{ slug: article.slug }} preload="intent" className="block">
        {/* Cover image with gradient overlay */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <SmartImage
            src={cover}
            alt={article.title}
            width={800}
            height={450}
            loading={index < 3 ? "eager" : "lazy"}
            aspectClass="w-full h-full"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Category badge */}
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-md px-3 py-1.5 text-xs uppercase tracking-widest font-medium shadow-sm">
              <Tag className="h-3 w-3" />
              {categoryLabel(article.category)}
            </span>
          </div>

          {/* Read time badge */}
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-md px-3 py-1.5 text-xs font-medium shadow-sm">
              <Clock className="h-3 w-3" />
              {article.read_time_minutes} min
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span className="font-medium">{publishedDate}</span>
            {article.country_code && (
              <>
                <span>·</span>
                <span className="uppercase">{article.country_code}</span>
              </>
            )}
          </div>

          {/* Headline */}
          <h2 className="font-serif text-2xl md:text-3xl leading-tight group-hover:underline decoration-1 underline-offset-4">
            {article.title}
          </h2>

          {/* Summary */}
          {article.dek && (
            <p className="mt-4 text-base leading-relaxed text-foreground/80 line-clamp-4">
              {article.dek}
            </p>
          )}

          {/* Read more */}
          <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium border-b border-foreground pb-0.5 transition-all group-hover:gap-2.5">
            Read full story
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>

      {/* Don't Get a Word? — inline dictionary search */}
      <CardDictionary />
    </motion.article>
  );
}

function CardDictionary() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useServerFn(searchWord);
  const debouncedTrim = debounced.trim();
  const { data, isLoading } = useQuery({
    queryKey: ["card-word-search", debouncedTrim],
    queryFn: () => runSearch({ data: { word: debouncedTrim } }),
    enabled: debouncedTrim.length >= 2,
    staleTime: 1000 * 60 * 30,
  });

  const found = data?.found ? data.entry : null;

  return (
    <div className="border-t rule px-6 md:px-8 py-5 bg-muted/20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Search className="h-3.5 w-3.5" />
        <span className="font-medium uppercase tracking-widest">Don't Get a Word?</span>
      </div>
      <p className="text-xs text-muted-foreground/80 mb-3 leading-relaxed">
        Search any word to instantly see its meaning, pronunciation, synonyms, examples, and more.
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              setDebounced(query.trim());
              setShowResult(true);
            }
          }}
          placeholder="Search any word..."
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-full border rule bg-background py-2.5 pl-4 pr-9 text-sm font-serif leading-snug transition focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebounced("");
              setShowResult(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showResult && debouncedTrim.length >= 2 && (
        <div className="mt-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Searching the dictionary…</p>
          ) : found ? (
            <DictionaryResult entry={found} />
          ) : data && !data.found ? (
            <p className="text-xs text-muted-foreground">
              No entry found. Check spelling or try another word.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DictionaryResult({ entry }: { entry: VocabEntry }) {
  const speak = () => {
    if (!entry.word || typeof window === "undefined") return;
    try {
      const u = new SpeechSynthesisUtterance(entry.word);
      u.rate = 0.9;
      window.speechSynthesis?.speak(u);
    } catch {}
  };

  return (
    <div className="rounded-lg border rule p-4 bg-background">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-serif text-lg">{entry.word}</h4>
        {entry.pronunciation && (
          <span className="text-xs italic text-muted-foreground">{entry.pronunciation}</span>
        )}
        <button
          onClick={speak}
          aria-label={`Pronounce ${entry.word}`}
          className="ml-auto p-1 text-muted-foreground hover:text-foreground transition"
        >
          <Volume2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {entry.partOfSpeech && (
        <span className="inline-block border rule px-1.5 py-0.5 text-[0.6rem] uppercase tracking-widest text-muted-foreground mb-2">
          {entry.partOfSpeech}
        </span>
      )}
      {entry.meaning && (
        <p className="text-sm leading-relaxed text-foreground/90 mb-1">{entry.meaning}</p>
      )}
      {entry.example && (
        <p className="text-xs italic text-muted-foreground border-l-2 border-foreground/10 pl-2 mt-2">
          {entry.example}
        </p>
      )}
      {entry.synonyms?.length ? (
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-medium">Synonyms:</span> {entry.synonyms.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function StoryCardSkeleton() {
  return (
    <div className="rounded-xl border rule overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-muted/40" />
      <div className="p-5 space-y-2">
        <div className="h-3 w-20 bg-muted/40 rounded" />
        <div className="h-5 w-full bg-muted/40 rounded" />
        <div className="h-4 w-5/6 bg-muted/30 rounded" />
        <div className="h-4 w-3/4 bg-muted/30 rounded" />
      </div>
    </div>
  );
}

function StoryCard({ article, index }: { article: ArticleSummary; index: number }) {
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  const publishedDate = article.published_at
    ? relativeTime(article.published_at)
    : article.created_at
      ? relativeTime(article.created_at)
      : "";

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(article.title);
      u.rate = 0.9;
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(u);
    } catch {}
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      className="group flex flex-col overflow-hidden rounded-xl border rule bg-card/60 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-lg hover:bg-card/80 hover:-translate-y-0.5"
    >
      <Link to="/article/$slug" params={{ slug: article.slug }} preload="intent" className="block">
        {/* Image — crisp, fully visible */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <SmartImage
            src={cover}
            alt={article.title}
            width={600}
            height={375}
            loading={index < 6 ? "eager" : "lazy"}
            aspectClass="w-full h-full"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Subtle gradient only at top for badge legibility */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/30 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-md px-2.5 py-1 text-[0.6rem] uppercase tracking-widest font-medium shadow-sm">
              <Tag className="h-2.5 w-2.5" />
              {categoryLabel(article.category)}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-md px-2.5 py-1 text-[0.6rem] font-medium shadow-sm">
              <Clock className="h-2.5 w-2.5" />
              {article.read_time_minutes}m
            </span>
          </div>
        </div>
      </Link>

      {/* Content — summary first, visible and readable */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground mb-2">
          <span className="font-medium">{publishedDate}</span>
          {article.country_code && (
            <>
              <span>·</span>
              <span className="uppercase">{article.country_code}</span>
            </>
          )}
        </div>

        <Link to="/article/$slug" params={{ slug: article.slug }} preload="intent">
          <h2 className="font-serif text-lg leading-snug group-hover:underline decoration-1 underline-offset-4">
            {article.title}
          </h2>
        </Link>

        {article.dek && (
          <p className="mt-2 text-sm leading-relaxed text-foreground/80 line-clamp-3">
            {article.dek}
          </p>
        )}

        <Link
          to="/article/$slug"
          params={{ slug: article.slug }}
          preload="intent"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium border-b border-foreground pb-0.5 transition-all group-hover:gap-2 self-start"
        >
          Read full story
          <ChevronRight className="h-3 w-3" />
        </Link>

        {/* Compact action row — small, peaceful */}
        <div className="mt-4 pt-3 border-t border-foreground/10 flex items-center gap-3">
          <ArticleActions articleId={article.id} title={article.title} />
          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/article/$slug"
              params={{ slug: article.slug }}
              hash="discussion"
              aria-label="Comments"
              className="p-1.5 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-foreground/5"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/article/$slug"
              params={{ slug: article.slug }}
              hash="knowledge-check"
              aria-label="Questions"
              className="p-1.5 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-foreground/5"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={speak}
              aria-label="Listen"
              className="p-1.5 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-foreground/5"
            >
              <Headphones className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function SwipeView({
  articles,
  hasMore,
  loadingMore,
  loadMore,
}: {
  articles: ArticleSummary[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);
  const article = articles[index];

  const goNext = useCallback(() => {
    if (index < articles.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    } else if (hasMore && !loadingMore) {
      loadMore();
    }
  }, [index, articles.length, hasMore, loadingMore, loadMore]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
    }
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  if (!article) {
    return (
      <div className="text-center py-20">
        <p className="dek">Loading stories…</p>
      </div>
    );
  }

  const cover = article.cover_image_url || fallbackCoverUrl(article);
  const publishedDate = article.published_at
    ? relativeTime(article.published_at)
    : article.created_at
      ? relativeTime(article.created_at)
      : "";

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = false;
  }
  function onTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - touchStartY.current;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) {
      isSwiping.current = true;
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!isSwiping.current) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > 60) {
      if (dy < 0) goNext();
      else goPrev();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background touch-none overscroll-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress dots — top right, subtle */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        {articles.slice(Math.max(0, index - 2), index + 3).map((a, i) => {
          const realIdx = Math.max(0, index - 2) + i;
          return (
            <span
              key={a.id}
              className={`w-1 rounded-full transition-all duration-300 ${
                realIdx === index ? "h-6 bg-foreground" : "h-1.5 bg-foreground/25"
              }`}
            />
          );
        })}
      </div>

      {/* Close — return to classic feed */}
      <Link
        to="/today"
        aria-label="All stories"
        className="absolute top-3 left-3 z-20 p-2 rounded-full bg-background/80 backdrop-blur-md text-muted-foreground hover:text-foreground transition"
      >
        <X className="h-5 w-5" />
      </Link>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={article.id}
          custom={direction}
          initial={{ opacity: 0, y: direction === 1 ? "100%" : "-100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: direction === 1 ? "-100%" : "100%" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex flex-col"
        >
          {/* Full-bleed cover image — top 55% */}
          <Link
            to="/article/$slug"
            params={{ slug: article.slug }}
            preload="intent"
            className="relative h-[55%] min-h-[280px] w-full overflow-hidden shrink-0"
          >
            <SmartImage
              src={cover}
              alt={article.title}
              width={800}
              height={800}
              loading="eager"
              aspectClass="w-full h-full"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

            {/* Category badge */}
            <div className="absolute top-14 left-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur-md px-3 py-1.5 text-xs uppercase tracking-widest font-medium shadow-sm">
                <Tag className="h-3 w-3" />
                {categoryLabel(article.category)}
              </span>
            </div>

            {/* Read time badge */}
            <div className="absolute top-14 right-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur-md px-3 py-1.5 text-xs font-medium shadow-sm">
                <Clock className="h-3 w-3" />
                {article.read_time_minutes} min
              </span>
            </div>
          </Link>

          {/* Content area — bottom 45% */}
          <div className="flex-1 min-h-0 px-5 sm:px-8 pt-4 pb-24 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="font-medium">{publishedDate}</span>
              {article.country_code && (
                <>
                  <span>·</span>
                  <span className="uppercase">{article.country_code}</span>
                </>
              )}
            </div>

            <Link to="/article/$slug" params={{ slug: article.slug }} preload="intent">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl leading-tight hover:underline decoration-1 underline-offset-4">
                {article.title}
              </h2>
            </Link>

            {article.dek && (
              <p className="mt-3 text-base sm:text-lg leading-relaxed text-foreground/85 font-serif line-clamp-5">
                {article.dek}
              </p>
            )}

            <Link
              to="/article/$slug"
              params={{ slug: article.slug }}
              preload="intent"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium border-b border-foreground pb-0.5 transition-all hover:gap-2.5"
            >
              Read full story
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Features bar — fixed at bottom of the card */}
          <div className="absolute bottom-0 left-0 right-0 border-t rule bg-background/95 backdrop-blur-xl px-5 sm:px-8 py-3 flex items-center gap-4 z-10">
            <ArticleActions articleId={article.id} title={article.title} />
            <div className="flex items-center gap-3 ml-auto">
              <Link
                to="/article/$slug"
                params={{ slug: article.slug }}
                hash="discussion"
                aria-label="Comments"
                className="p-2 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-foreground/5"
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
              <Link
                to="/article/$slug"
                params={{ slug: article.slug }}
                hash="knowledge-check"
                aria-label="Questions"
                className="p-2 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-foreground/5"
              >
                <HelpCircle className="h-4 w-4" />
              </Link>
              <button
                onClick={() => {
                  try {
                    const u = new SpeechSynthesisUtterance(article.title);
                    u.rate = 0.9;
                    window.speechSynthesis?.cancel();
                    window.speechSynthesis?.speak(u);
                  } catch {}
                }}
                aria-label="Listen"
                className="p-2 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-foreground/5"
              >
                <Headphones className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {loadingMore && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
