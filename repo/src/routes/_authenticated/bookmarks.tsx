import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyBookmarks } from "@/lib/interactions.functions";
import { ArticleCard } from "@/components/article-card";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "My Library — The United Hell" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const fn = useServerFn(listMyBookmarks);
  const q = useQuery({ queryKey: ["my-bookmarks"], queryFn: () => fn() });

  return (
    <div className="container-edit py-10 md:py-14">
      <header className="border-b rule pb-6 mb-10">
        <div className="kicker">Your collection</div>
        <h1 className="display-1 mt-3">My Library.</h1>
        <p className="dek mt-3">Everything you've saved, in one place.</p>
      </header>

      {q.isLoading && <p className="dek">Loading…</p>}
      {q.data && q.data.length === 0 && (
        <p className="dek">Nothing saved yet. Open any story and tap Save.</p>
      )}
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((a) => (
          <ArticleCard key={a.id} article={a} variant="default" />
        ))}
      </div>
    </div>
  );
}
