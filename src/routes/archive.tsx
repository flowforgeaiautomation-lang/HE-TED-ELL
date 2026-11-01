import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, Newspaper, ArrowRight, ChevronLeft } from "lucide-react";
import { getArchiveList, type ArchiveEntry } from "@/lib/epaper.functions";
import { SmartImage } from "@/components/SmartImage";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import { ScrollToTop } from "@/components/ScrollToTop";

const archiveQ = queryOptions({
  queryKey: ["epaper-archive"],
  queryFn: () => getArchiveList(),
});

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Newspaper Archive — The United Hell" },
      { name: "description", content: "Browse past editions of The Daily Discovery. Every day's newspaper, archived and searchable." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Newspaper Archive — The United Hell" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/archive") },
      { property: "og:image", content: SITE_LOGO },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/archive") }],
  }),
  loader: async ({ context }) => {
    try {
      await context.queryClient.prefetchQuery(archiveQ);
    } catch {}
  },
  component: ArchivePage,
});

function ArchivePage() {
  const { data: entries } = useSuspenseQuery(archiveQ);
  const [visibleCount, setVisibleCount] = useState(24);

  const visible = entries.slice(0, visibleCount);
  const hasMore = entries.length > visibleCount;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <ScrollToTop />

      {/* Header */}
      <header className="border-b-2 rule">
        <div className="max-w-7xl mx-auto px-4 pt-8 pb-6">
          <Link to="/editions/epaper" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-4">
            <ChevronLeft className="h-4 w-4" /> Back to Today's Edition
          </Link>
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Newspaper Archive</span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">Past Editions</h1>
            <p className="text-sm text-muted-foreground mt-2 italic">Every edition of The Daily Discovery, preserved for posterity.</p>
          </div>
        </div>
      </header>

      {/* Editions Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {entries.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No past editions found yet. Check back soon!</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((entry) => (
                <ArchiveCard key={entry.date} entry={entry} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={() => setVisibleCount((c) => c + 24)}
                  className="inline-flex items-center gap-2 px-6 py-3 border rule rounded-sm text-sm font-medium hover:bg-muted transition"
                >
                  Load More Editions <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t-2 rule py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <img src={SITE_LOGO} alt={SITE_NAME} className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <p className="font-serif text-lg mb-1">The United Hell</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Beyond Headlines. Beyond Discovery.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/editions/epaper" className="hover:text-foreground transition">Today's Edition</Link>
            <Link to="/" className="hover:text-foreground transition">Home</Link>
            <Link to="/briefing" className="hover:text-foreground transition">Daily Briefing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ArchiveCard({ entry }: { entry: ArchiveEntry }) {
  return (
    <Link
      to="/edition/$date"
      params={{ date: entry.date }}
      className="group block border rule rounded-sm overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Cover */}
      <div className="aspect-[4/5] bg-muted relative overflow-hidden">
        {entry.coverImage ? (
          <SmartImage
            src={entry.coverImage}
            alt={entry.coverTitle}
            width={400}
            height={500}
            loading="lazy"
            aspectClass="w-full h-full object-cover"
            className="group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Newspaper className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Edition #{entry.editionNumber}</div>
          <div className="font-serif text-lg font-bold leading-tight">{entry.dateDisplay}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{entry.totalArticles} stories</span>
        <span>{entry.totalPages} pages</span>
        <span className="flex items-center gap-1 font-medium text-foreground group-hover:underline">
          Read <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
