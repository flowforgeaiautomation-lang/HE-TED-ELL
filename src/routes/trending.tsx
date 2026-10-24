import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { listArticles } from "@/lib/articles.functions";
import { ArticleCard } from "@/components/article-card";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import { PageEndAd } from "@/components/ads/EzoicAd";

type Sort = "trending" | "most_read" | "most_saved" | "recent";

const SORTS: { id: Sort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "most_read", label: "Most Read" },
  { id: "most_saved", label: "Most Saved" },
  { id: "recent", label: "Most Recent" },
];

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending — The United Hell" },
      { name: "description", content: "Trending stories — today, this week, this month." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Trending — The United Hell" },
      { property: "og:description", content: "Trending stories — today, this week, this month." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/trending") },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Trending — The United Hell" },
      { name: "twitter:description", content: "Trending stories — today, this week, this month." },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/trending") },
    ],
  }),
  loader: async ({ context }) => {
    try {
      await context.queryClient.prefetchQuery(
        queryOptions({
          queryKey: ["trending", "trending"],
          queryFn: async () => (await listArticles({ data: { sort: "trending", limit: 60 } })).items,
        }),
      );
    } catch {}
  },
  component: TrendingPage,
  errorComponent: ({ error }) => <div className="container-edit py-20"><p className="dek">{error.message}</p></div>,
  notFoundComponent: () => null,
});

function TrendingPage() {
  const [sort, setSort] = useState<Sort>("trending");
  const q = useSuspenseQuery(
    queryOptions({
      queryKey: ["trending", sort],
      queryFn: async () => (await listArticles({ data: { sort, limit: 60 } })).items,
    }),
  );

  return (
    <div className="container-edit py-10 md:py-14">
      <header className="border-b rule pb-6 mb-10">
        <div className="kicker">What readers are reading</div>
        <h1 className="display-1 mt-3">Trending now.</h1>
      </header>

      <div className="flex flex-wrap gap-2 mb-10">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`px-3 py-1.5 text-xs uppercase tracking-widest border rule transition ${sort === s.id ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-12">
        {q.data.map((a, i) => (
          <div key={a.id} className="grid gap-6 md:grid-cols-12 items-center border-b rule pb-8">
            <div className="md:col-span-1 font-serif text-5xl text-muted-foreground tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="md:col-span-11">
              <ArticleCard article={a} variant="wide" />
            </div>
          </div>
        ))}
      </div>
      <PageEndAd />
    </div>
  );
}
