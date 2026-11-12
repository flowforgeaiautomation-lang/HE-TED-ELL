import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueries, queryOptions } from "@tanstack/react-query";
import { Sparkles, Tag } from "lucide-react";
import { listArticles } from "@/lib/articles.functions";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardSkeletonGrid } from "@/components/ArticleCardSkeleton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import { categoryLabel } from "@/lib/categories";
import type { ArticleSummary } from "@/lib/types";

const TOP_COUNT = 10;

const TOP10_CATEGORIES = [
  "world",
  "markets",
  "technology",
  "artificial-intelligence",
  "cybersecurity",
  "science",
  "space",
  "health",
  "climate",
  "politics",
  "football",
  "cricket",
  "economics",
  "culture",
  "books",
  "movies",
];

function top10CategoryQuery(category: string) {
  return queryOptions({
    queryKey: ["top10", category],
    queryFn: () => listArticles({ data: { limit: TOP_COUNT, sort: "trending", category } }),
    staleTime: 60_000,
  });
}

export const Route = createFileRoute("/top10")({
  head: () => ({
    meta: [
      { title: "Top 10 — The United Hell" },
      { name: "description", content: "The ten most talked-about stories right now, across every category." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Top 10 — The United Hell" },
      { property: "og:description", content: "The ten most talked-about stories right now, across every category." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/top10") },
      { property: "og:image", content: SITE_LOGO },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/top10") }],
  }),
  loader: async ({ context }) => {
    try {
      await context.queryClient.prefetchQuery(top10CategoryQuery("world"));
    } catch (e) {
      console.error("Top 10 loader failed:", e);
    }
  },
  component: Top10Page,
});

function Top10Page() {
  const categoryQueries = useQueries({
    queries: TOP10_CATEGORIES.map((cat) => top10CategoryQuery(cat)),
  });

  const anyLoading = categoryQueries.some((q) => q.isLoading);
  const anyError = categoryQueries.some((q) => q.isError);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container-edit py-6 md:py-8">
      <div className="flex items-center justify-between border-b rule pb-3 mb-2">
        <div className="kicker flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Top 10
        </div>
        <Link to="/today" className="text-xs uppercase tracking-widest hover:underline underline-offset-4">
          All today's news
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-8">{dateStr}</p>

      {anyLoading && <ArticleCardSkeletonGrid count={6} />}

      {anyError && !anyLoading && (
        <div className="text-center py-16">
          <p className="dek">We couldn't load the Top 10 right now.</p>
          <button
            onClick={() => categoryQueries.forEach((q) => q.refetch())}
            className="mt-4 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            Try again
          </button>
        </div>
      )}

      {!anyLoading && (
        <div className="space-y-16">
          {TOP10_CATEGORIES.map((category, catIdx) => {
            const query = categoryQueries[catIdx];
            const items = (query.data?.items ?? []) as ArticleSummary[];

            if (items.length === 0) return null;

            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-6 border-b rule pb-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-serif text-xl font-bold">{categoryLabel(category)}</h2>
                  <span className="text-xs text-muted-foreground ml-auto">{items.length} stor{items.length === 1 ? "y" : "ies"}</span>
                </div>
                <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((article, i) => (
                    <li key={article.id} className="relative">
                      <span
                        className="absolute -top-4 -left-2 font-serif text-5xl font-bold text-foreground/15"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <ArticleCard article={article} variant="default" />
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}

          {categoryQueries.every((q) => (q.data?.items ?? []).length === 0) && (
            <p className="dek text-center py-16">No stories are ranked yet. Check back soon.</p>
          )}
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}