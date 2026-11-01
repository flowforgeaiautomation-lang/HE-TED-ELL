import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { ArticleCardSkeletonGrid } from "@/components/ArticleCardSkeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { listArticles } from "@/lib/articles.functions";
import { curateNow, curateNowPublic } from "@/lib/ai.functions";
import { ArticleCard } from "@/components/article-card";
import { HomepageNav } from "@/components/HomepageNav";
import { CategoryModal } from "@/components/CategoryModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { categoryLabel } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import type { ArticleSummary } from "@/lib/types";
import { PageEndAd } from "@/components/ads/EzoicAd";

const discoverQuery = (category: string | undefined, country: string | undefined) =>
  queryOptions({
    queryKey: ["discover", category ?? "all", country ?? "world"],
    queryFn: () => listArticles({ data: { limit: 24, offset: 0, category, country } }),
    staleTime: 30_000,
  });

const COUNTRY_LABELS: Record<string, string> = {
  IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada",
  AU: "Australia", CN: "China", JP: "Japan", BR: "Brazil", FR: "France",
  DE: "Germany", AE: "UAE", SG: "Singapore", ZA: "South Africa",
};

const PAGE_SIZE = 24;

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: Math.min(i % 6, 5) * 0.06, ease: [0.2, 0.7, 0.2, 1] as const },
  }),
};

export const Route = createFileRoute("/discover")({
  validateSearch: (s: Record<string, unknown>) => ({
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Discover — The United Hell" },
      { name: "description", content: "Discover stories across topics, fields, eras, and cultures." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Discover — The United Hell" },
      { property: "og:description", content: "Discover stories across topics, fields, eras, and cultures." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/discover") },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Discover — The United Hell" },
      { name: "twitter:description", content: "Discover stories across topics, fields, eras, and cultures." },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/discover") }],
  }),
  loader: async ({ context }) => {
    try {
      await context.queryClient.prefetchQuery(discoverQuery(undefined, undefined));
    } catch {}
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  const search = useSearch({ from: "/discover" });
  const navigate = useNavigate();
  const [active, setActive] = useState<string | undefined>(search.category);
  const [showModal, setShowModal] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [country, setCountry] = useState<string>("WORLD");
  const ingestAuth = useServerFn(curateNow);
  const ingestPublic = useServerFn(curateNowPublic);

  // Single unified list — no split between "base" and "extra"
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const filterKeyRef = useRef<string>("");

  const countryParam = country === "WORLD" ? undefined : country;
  const articlesQuery = useQuery(discoverQuery(active, countryParam));

  // Seed articles from query data — merge new items instead of replacing
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
      // Merge: prepend any new items that aren't already in the list
      const existingIds = new Set(prev.map((a) => a.id));
      const newItems = items.filter((a: ArticleSummary) => !existingIds.has(a.id));
      if (newItems.length > 0) {
        return [...newItems, ...prev];
      }
      return prev;
    });
  }, [articlesQuery.data]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const readPrefs = () => setCountry(window.localStorage.getItem("tuh-country") || "WORLD");
    readPrefs();
    window.addEventListener("tuh-preferences", readPrefs);
    return () => window.removeEventListener("tuh-preferences", readPrefs);
  }, []);

  useEffect(() => { setActive(search.category); }, [search.category]);

  // Reset everything when filters change
  const currentFilterKey = `${active ?? "all"}|${country}`;
  useEffect(() => {
    if (filterKeyRef.current !== currentFilterKey) {
      filterKeyRef.current = currentFilterKey;
      setArticles([]);
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
          category: active,
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
  }, [hasMore, active, countryParam]);

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

  async function topUp() {
    setGenerating(true);
    try {
      let result: { inserted: number };
      if (signedIn) {
        result = await ingestAuth({ data: { maxItems: 60, category: active } });
      } else {
        result = await ingestPublic({ data: { maxItems: 12, category: active } });
      }
      if (result.inserted > 0) {
        toast.success(`${result.inserted} new stories added`);
        articlesQuery.refetch();
      } else {
        toast.message("No new stories found right now — try again in a few minutes");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="container-edit py-10 md:py-14">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        className="border-b rule pb-6 mb-10"
      >
        <div className="kicker">The Discovery Engine</div>
        <h1 className="display-1 mt-3">Discover</h1>
      </motion.header>

      <HomepageNav
        activeCategory={active}
        activeCountry={country}
        onCategoryChange={(category) => {
          setActive(category);
          navigate({ to: "/discover", search: { category } });
        }}
        onCountryChange={(c) => {
          const newCountry = c ?? "WORLD";
          setCountry(newCountry);
          if (c) {
            window.localStorage.setItem("tuh-country", c);
          } else {
            window.localStorage.removeItem("tuh-country");
          }
          window.dispatchEvent(new Event("tuh-preferences"));
        }}
        onExploreAllClick={() => setShowModal(true)}
      />

      <div className="flex items-center justify-between border-b rule pb-3 mb-8">
        <div className="kicker">
          {active ? categoryLabel(active) : country === "WORLD" ? "Latest from all sections" : `Latest from ${COUNTRY_LABELS[country] ?? country}`}
        </div>
        <Link
          to="/search"
          preload="intent"
          className="inline-flex items-center gap-2 border border-foreground px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Search
        </Link>
      </div>

      {articles.length > 0 && (
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <motion.div key={article.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
              <ArticleCard article={article} variant="default" />
            </motion.div>
          ))}
        </div>
      )}

      {articles.length === 0 && !articlesQuery.isLoading && !articlesQuery.isError && articlesQuery.isFetched && (
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

      <CategoryModal isOpen={showModal} onClose={() => setShowModal(false)} />
      <ScrollToTop />
      <PageEndAd />
    </div>
  );
}
