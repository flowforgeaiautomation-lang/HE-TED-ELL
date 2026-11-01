import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ArticleCardSkeletonGrid } from "@/components/ArticleCardSkeleton";
import { motion } from "framer-motion";
import { listArticles } from "@/lib/articles.functions";
import { ArticleCard } from "@/components/article-card";
import { ScrollToTop } from "@/components/ScrollToTop";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import type { ArticleSummary } from "@/lib/types";
import { PageEndAd } from "@/components/ads/EzoicAd";

const todayQuery = (country: string | undefined) =>
  queryOptions({
    queryKey: ["today-clean", country ?? "world"],
    queryFn: () => listArticles({ data: { limit: 24, country, todayOnly: true } }),
    staleTime: 30_000,
  });

const COUNTRY_LABELS: Record<string, string> = {
  IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada",
  AU: "Australia", CN: "China", JP: "Japan", BR: "Brazil", FR: "France",
  DE: "Germany", AE: "UAE", SG: "Singapore", ZA: "South Africa", NO: "Norway",
};

const PAGE_SIZE = 24;

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: Math.min(i % 6, 5) * 0.06, ease: [0.2, 0.7, 0.2, 1] as const },
  }),
};

export const Route = createFileRoute("/today")({
  validateSearch: (s: Record<string, unknown>) => ({
    country: typeof s.country === "string" ? s.country : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Today — The United Hell" },
      { name: "description", content: "Today's news — clean, continuous, and focused. No clutter, just stories." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Today — The United Hell" },
      { property: "og:description", content: "Today's news — clean and focused." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/today") },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Today — The United Hell" },
      { name: "twitter:description", content: "Today's news — clean and focused." },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/today") }],
  }),
  loader: async ({ context }) => {
    try {
      await context.queryClient.prefetchQuery(todayQuery(undefined));
    } catch (e) {
      console.error("Today loader failed:", e);
    }
  },
  component: TodayPage,
  errorComponent: ({ error }) => (
    <div className="container-edit py-20 text-center">
      <p className="dek">We couldn't load today's stories. {error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
      >
        Refresh page
      </button>
    </div>
  ),
  notFoundComponent: () => null,
});

function TodayPage() {
  const search = useSearch({ from: "/today" });
  const navigate = useNavigate();
  const [country, setCountry] = useState<string>(search.country || "WORLD");

  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const filterKeyRef = useRef<string>("");

  const countryParam = country === "WORLD" ? undefined : country;
  const articlesQuery = useQuery(todayQuery(countryParam));

  useEffect(() => {
    const result = articlesQuery.data;
    if (!result) return;
    const items = (result as any).items ?? (Array.isArray(result) ? result : []);
    setArticles((prev) => {
      if (prev.length === 0) {
        offsetRef.current = items.length;
        setHasMore((result as any).hasMore ?? true);
        return items;
      }
      const existingIds = new Set(prev.map((a) => a.id));
      const newItems = items.filter((a: ArticleSummary) => !existingIds.has(a.id));
      if (newItems.length > 0) {
        return [...newItems, ...prev];
      }
      return prev;
    });
  }, [articlesQuery.data]);

  useEffect(() => {
    const readPrefs = () => setCountry(window.localStorage.getItem("tuh-country") || "WORLD");
    readPrefs();
    window.addEventListener("tuh-preferences", readPrefs);
    return () => window.removeEventListener("tuh-preferences", readPrefs);
  }, []);

  useEffect(() => {
    if (search.country) {
      setCountry(search.country);
      window.localStorage.setItem("tuh-country", search.country);
      window.dispatchEvent(new Event("tuh-preferences"));
    }
  }, [search.country]);

  const currentFilterKey = country;
  useEffect(() => {
    if (filterKeyRef.current !== currentFilterKey) {
      filterKeyRef.current = currentFilterKey;
      setHasMore(true);
      offsetRef.current = 0;
    }
  }, [currentFilterKey]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const result = await listArticles({
        data: {
          limit: PAGE_SIZE,
          offset: offsetRef.current,
          country: countryParam,
        },
      });
      const newItems = (result as any).items ?? [];
      const newHasMore = (result as any).hasMore ?? true;
      if (newItems.length > 0) {
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const unique = newItems.filter((a: ArticleSummary) => !existingIds.has(a.id));
          return [...prev, ...unique];
        });
        offsetRef.current += newItems.length;
      }
      setHasMore(newHasMore && newItems.length > 0);
    } catch {
      setHasMore(true);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [hasMore, countryParam]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) loadMore();
      },
      { rootMargin: "800px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loadingMore, hasMore]);

  const showEmptyState =
    articles.length === 0 &&
    !articlesQuery.isLoading &&
    !articlesQuery.isError &&
    articlesQuery.isFetched;

  return (
    <div className="container-edit py-6 md:py-8">
      {/* Clean header — no category filter block */}
      <div className="flex items-center justify-between border-b rule pb-3 mb-8">
        <div className="kicker">
          {country === "WORLD"
            ? "Today's News"
            : `Today's News — ${COUNTRY_LABELS[country] ?? country}`}
        </div>
        <div className="flex items-center gap-3">
          {/* Country quick-switch */}
          <select
            value={country}
            onChange={(e) => {
              const val = e.target.value;
              setCountry(val);
              window.localStorage.setItem("tuh-country", val);
              window.dispatchEvent(new Event("tuh-preferences"));
              navigate({ to: "/today", search: { country: val === "WORLD" ? undefined : val } });
            }}
            className="appearance-none border rule bg-background px-3 py-1.5 text-xs uppercase tracking-widest cursor-pointer hover:bg-muted/30 transition focus:outline-none focus:ring-2 focus:ring-foreground/40"
            aria-label="Select country"
          >
            <option value="WORLD">World</option>
            {Object.entries(COUNTRY_LABELS).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <Link
            to="/search"
            preload="intent"
            className="inline-flex items-center gap-2 border border-foreground px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Search
          </Link>
        </div>
      </div>

      {/* Clean article grid — no Discover category block */}
      {articles.length > 0 && (
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <motion.div key={article.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
              <ArticleCard article={article} variant="default" />
            </motion.div>
          ))}
        </div>
      )}

      {showEmptyState && (
        <div className="text-center py-16">
          <Sparkles className="h-8 w-8 mx-auto mb-4 text-foreground/60" strokeWidth={1.25} />
          <p className="dek flex items-center justify-center gap-1.5">
            Bringing the universe together
            <span className="inline-flex gap-1 ml-1">
              <span className="w-1 h-1 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "200ms" }} />
              <span className="w-1 h-1 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "400ms" }} />
            </span>
          </p>
          <Link
            to="/briefing"
            className="mt-6 inline-flex border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            Read the Daily Brief
          </Link>
        </div>
      )}

      {articlesQuery.isError && (
        <div className="text-center py-16">
          <p className="dek">We couldn't load stories right now. {(articlesQuery.error as Error)?.message}</p>
          <button
            onClick={() => articlesQuery.refetch()}
            className="mt-4 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            Try again
          </button>
        </div>
      )}

      {articlesQuery.isLoading && articles.length === 0 && (
        <ArticleCardSkeletonGrid count={6} />
      )}

      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <ScrollToTop />
      <PageEndAd />
    </div>
  );
}
