import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchArticles } from "@/lib/articles.functions";
import { ArticleCard } from "@/components/article-card";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Search — The United Hell" },
      { name: "description", content: "Search across topics, places, people, and discoveries." },
      { property: "og:title", content: "Search — The United Hell" },
      { property: "og:description", content: "Search across topics, places, people, and discoveries." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const initial = Route.useSearch().q ?? "";
  const [q, setQ] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  useEffect(() => {
    setQ(initial);
    setSubmitted(initial);
  }, [initial]);
  const fn = useServerFn(searchArticles);
  const query = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => fn({ data: { q: submitted } }),
    enabled: !!submitted,
  });

  return (
    <div className="container-read py-10 md:py-16">
      <div className="text-center border-b rule pb-10 mb-10">
        <div className="kicker">Search the archive</div>
        <h1 className="display-1 mt-3">Find a story.</h1>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()); }}
        className="relative"
      >
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Topics, people, places, technologies…"
          className="w-full bg-transparent border-b-2 border-foreground pl-10 pr-4 py-4 text-xl font-serif focus:outline-none"
        />
      </form>

      {submitted && (
        <div className="mt-10">
          <div className="kicker mb-6">Results for "{submitted}"</div>
          {query.isLoading && <p className="dek">Searching…</p>}
          {query.data && query.data.length === 0 && <p className="dek">No matches.</p>}
          <div className="grid gap-10 sm:grid-cols-2">
            {query.data?.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
