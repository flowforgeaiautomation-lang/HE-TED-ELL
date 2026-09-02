import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { getCountryStats, listArticles } from "@/lib/articles.functions";
import { COUNTRIES } from "@/lib/categories";
import { ArticleCard } from "@/components/article-card";

const statsQ = queryOptions({ queryKey: ["country-stats"], queryFn: () => getCountryStats() });

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "World — The United Hell" },
      { name: "description", content: "Explore stories from every country, on every continent." },
      { property: "og:title", content: "World — The United Hell" },
      { property: "og:description", content: "Explore stories from every country, on every continent." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQ),
  component: MapPage,
  errorComponent: ({ error }) => <div className="container-edit py-20"><p className="dek">{error.message}</p></div>,
  notFoundComponent: () => null,
});

function MapPage() {
  const { data: stats } = useSuspenseQuery(statsQ);
  const [active, setActive] = useState<string | undefined>(undefined);
  const ordered = Object.entries(stats).sort((a, b) => b[1] - a[1]);

  const q = useQuery({
    queryKey: ["country-articles", active],
    queryFn: () => listArticles({ data: { country: active, limit: 12 } }),
    enabled: !!active,
  });

  return (
    <div className="container-edit py-10 md:py-14">
      <header className="border-b rule pb-6 mb-10">
        <div className="kicker">World Exploration</div>
        <h1 className="display-1 mt-3">The Atlas of Discovery.</h1>
        <p className="dek mt-3 max-w-2xl">
          Click a country to read what's happening there — the science, the wildlife, the
          architecture, the people.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-4 border-r rule pr-6">
          <div className="kicker mb-4">Countries in this edition</div>
          <ul className="divide-y rule">
            {ordered.map(([cc, n]) => {
              const meta = COUNTRIES[cc] ?? { name: cc, flag: "🏳" };
              const isActive = active === cc;
              return (
                <li key={cc}>
                  <button
                    onClick={() => setActive(cc)}
                    className={`w-full text-left py-3 flex items-center justify-between gap-3 hover:opacity-70 ${isActive ? "font-semibold" : ""}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{meta.flag}</span>
                      <span className="font-serif">{meta.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className="lg:col-span-8">
          {!active && (
            <div className="text-center py-20">
              <div className="kicker">Select a country</div>
              <p className="dek mt-4 max-w-md mx-auto">
                Every story is filed by its origin. Pick anywhere on the list to read what we've
                found there.
              </p>
            </div>
          )}
          {active && (
            <>
              <div className="flex items-center justify-between mb-6 border-b rule pb-3">
                <div>
                  <div className="kicker">Stories from</div>
                  <h2 className="display-2 mt-1">
                    {COUNTRIES[active]?.flag} {COUNTRIES[active]?.name ?? active}
                  </h2>
                </div>
                <Link to="/discover" className="kicker hover:opacity-60">All sections →</Link>
              </div>
              {q.isLoading && <p className="dek">Loading…</p>}
              <div className="grid gap-10 md:grid-cols-2">
                {q.data?.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="default" />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
