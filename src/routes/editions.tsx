import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, X, ArrowRight, ExternalLink, Newspaper } from "lucide-react";
import { BOOKS, AUTHOR, type EditionBook } from "@/lib/editions-data";
import { canonicalUrl, SITE_NAME } from "@/lib/seo";
import { PageEndAd } from "@/components/ads/EzoicAd";

export const Route = createFileRoute("/editions")({
  head: () => ({
    meta: [
      { title: "Editions | Altair Veda" },
      { name: "description", content: "Discover every edition of the Powerful Mind Series by Altair Veda — a collection on intelligence, focus, discipline, strategic thinking, and leadership." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Editions | Altair Veda" },
      { property: "og:description", content: "Discover every edition of the Powerful Mind Series by Altair Veda." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/editions") },
      { property: "og:image", content: BOOKS[0].coverImage },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/editions") }],
  }),
  component: EditionsPage,
});

function EditionsPage() {
  const [selectedSlug, setSelectedSlug] = useState<string>(BOOKS[0].slug);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedBook = useMemo(
    () => BOOKS.find((b) => b.slug === selectedSlug) ?? BOOKS[0],
    [selectedSlug]
  );

  const filteredBooks = useMemo(() => {
    const sorted = [...BOOKS].sort((a, b) => a.seriesOrder - b.seriesOrder);
    if (!searchTerm.trim()) return sorted;
    const q = searchTerm.toLowerCase();
    return sorted.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.subtitle.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.keywords.some((k) => k.toLowerCase().includes(q)) ||
        String(b.seriesOrder) === q
    );
  }, [searchTerm]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Hero */}
      <section className="px-4 pt-12 pb-8 sm:pt-16 sm:pb-10 border-b border-border">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground mb-3">
            The Powerful Mind Series
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-3">
            Editions
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A timeless collection of books by Altair Veda — created to inspire knowledge, curiosity, wisdom, and lifelong learning.
          </p>
        </div>
      </section>

      {/* Featured Book */}
      <section className="px-4 py-8 sm:py-10 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-[260px_1fr] gap-8 md:gap-12 items-start">
            {/* Cover */}
            <div className="mx-auto md:mx-0 w-[180px] sm:w-[220px] md:w-full md:max-w-[260px]">
              <div className="relative aspect-[2/3] border border-border overflow-hidden bg-muted">
                <img
                  key={selectedBook.slug}
                  src={selectedBook.coverImage}
                  alt={`${selectedBook.title} — book cover`}
                  className="w-full h-full object-contain animate-fade-in"
                  loading="eager"
                />
              </div>
            </div>

            {/* Details */}
            <div key={selectedBook.slug} className="animate-fade-in">
              <p className="text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                Book {String(selectedBook.seriesOrder).padStart(2, "0")} · {selectedBook.series}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-2">
                {selectedBook.title}
              </h2>
              <p className="text-base text-muted-foreground font-serif italic mb-4">
                {selectedBook.subtitle}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-3">
                {selectedBook.description}
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground mb-6">
                <span>Published {selectedBook.publicationDate.kindle}</span>
                <span>·</span>
                <span>{selectedBook.language}</span>
              </div>

              <a
                href={selectedBook.amazonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background text-xs font-semibold uppercase tracking-[0.15em] hover:opacity-80 transition-opacity"
              >
                Buy on Amazon <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="px-4 pt-8 pb-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, topic, or book number..."
              className="w-full bg-background border border-border pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Book List */}
      <section className="px-4 pb-12">
        <div className="max-w-5xl mx-auto">
          {filteredBooks.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              No editions match your search.
            </p>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              <Link
                to="/epaper"
                className="group flex items-center gap-4 sm:gap-6 py-5 px-2 sm:px-4 transition-colors animate-fade-in cursor-pointer hover:bg-muted/50 bg-muted/30"
                style={{ animationDelay: "0ms" }}
              >
                <div className="shrink-0 w-14 h-[84px] sm:w-16 sm:h-24 border border-border overflow-hidden bg-foreground flex items-center justify-center">
                  <Newspaper className="h-7 w-7 text-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[0.6rem] uppercase tracking-[0.2em] text-foreground font-semibold">Daily Edition</span>
                    <span className="text-[0.55rem] uppercase tracking-[0.15em] text-foreground border border-foreground px-1.5 py-0.5">Live</span>
                  </div>
                  <h3 className="font-serif text-base sm:text-lg font-bold leading-tight">
                    The Daily Discovery E-Paper
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    Beyond Headlines. Beyond Discovery. — Your daily digital newspaper
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
                    Your daily digital newspaper featuring the world's most important stories, science, innovation, and knowledge — curated daily for the curious reader.
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[0.65rem] text-muted-foreground">
                    <span>Updated Daily</span>
                    <span>·</span>
                    <span>English</span>
                  </div>
                </div>
                <div className="shrink-0 hidden sm:flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[0.65rem] font-semibold uppercase tracking-[0.12em]">
                  Read <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
              {filteredBooks.map((book, i) => (
                <BookListRow
                  key={book.slug}
                  book={book}
                  index={i}
                  isSelected={book.slug === selectedSlug}
                  onSelect={() => setSelectedSlug(book.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Author */}
      <section className="px-4 py-12 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block mb-5">
            <img
              src="/images/authors/file_0000000048408230ae003d41cbf27281.jpg"
              alt="Altair Veda"
              className="w-28 h-28 object-cover rounded-full mx-auto border border-border"
              loading="lazy"
            />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-3">{AUTHOR.name}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto mb-5">
            {AUTHOR.shortBio}
          </p>
          <a
            href="/information"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            View Author <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
      <PageEndAd />
    </div>
  );
}

function BookListRow({
  book,
  index,
  isSelected,
  onSelect,
}: {
  book: EditionBook;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-4 sm:gap-6 py-5 px-2 sm:px-4 transition-colors animate-fade-in cursor-pointer ${
        isSelected ? "bg-muted" : "hover:bg-muted/50"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onSelect}
    >
      {/* Cover */}
      <div className="shrink-0 w-14 h-[84px] sm:w-16 sm:h-24 border border-border overflow-hidden bg-muted">
        <img
          src={book.coverImage}
          alt={`${book.title} — book cover`}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            {String(book.seriesOrder).padStart(2, "0")}
          </span>
          {isSelected && (
            <span className="text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground border border-border px-1.5 py-0.5">
              Featured
            </span>
          )}
        </div>
        <h3 className="font-serif text-base sm:text-lg font-bold leading-tight truncate">
          {book.title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
          {book.subtitle}
        </p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
          {book.description}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[0.65rem] text-muted-foreground">
          <span>{book.publicationDate.kindle}</span>
          <span>·</span>
          <span>{book.language}</span>
        </div>
      </div>

      {/* Buy button — real anchor, stops click propagation so it doesn't interfere with row select */}
      <div className="shrink-0 hidden sm:block" onClick={(e) => e.stopPropagation()}>
        <a
          href={book.amazonLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[0.65rem] font-semibold uppercase tracking-[0.12em] hover:opacity-80 transition-opacity"
        >
          Buy <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
