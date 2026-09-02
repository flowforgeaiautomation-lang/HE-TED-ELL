import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShoppingBag, Eye, Heart, Share2, BookOpen, Clock, Globe, Calendar, FileText, User, ChevronRight, ChevronLeft, X, Check, Library, Bookmark } from "lucide-react";
import { getBookBySlug, getRelatedBooks, BOOKS, AUTHOR } from "@/lib/editions-data";
import { canonicalUrl, SITE_NAME } from "@/lib/seo";

export const Route = createFileRoute("/editions/$slug")({
  head: ({ params }) => {
    const book = getBookBySlug(params.slug);
    if (!book) return { meta: [], links: [] };
    return {
      meta: [
        { title: `${book.title} | Altair Veda` },
        { name: "description", content: book.description },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:title", content: `${book.title} — ${book.subtitle}` },
        { property: "og:description", content: book.description },
        { property: "og:type", content: "book" },
        { property: "og:url", content: canonicalUrl(`/editions/${book.slug}`) },
        { property: "og:image", content: book.coverImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${book.title} | Altair Veda` },
        { name: "twitter:description", content: book.description },
      ],
      links: [{ rel: "canonical", href: canonicalUrl(`/editions/${book.slug}`) }],
    };
  },
  component: BookDetailPage,
  notFoundComponent: () => (
    <div className="container-read py-20 text-center">
      <h1 className="font-serif text-3xl">Edition not found</h1>
      <Link to="/editions" className="text-[#E6C17D] hover:underline mt-4 inline-block">Back to Editions</Link>
    </div>
  ),
});

function BookDetailPage() {
  const { slug } = Route.useParams();
  const book = getBookBySlug(slug);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edition-favorites");
      if (saved) setIsFavorite(new Set(JSON.parse(saved)).has(slug));
    } catch {}
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!book) return null;

  const related = getRelatedBooks(slug);
  const seriesIndex = book.seriesOrder - 1;
  const prevBook = seriesIndex > 0 ? BOOKS[seriesIndex - 1] : null;
  const nextBook = seriesIndex < BOOKS.length - 1 ? BOOKS[seriesIndex + 1] : null;

  function toggleFavorite() {
    try {
      const saved = localStorage.getItem("edition-favorites");
      const set = new Set<string>(saved ? JSON.parse(saved) : []);
      if (set.has(slug)) set.delete(slug);
      else set.add(slug);
      localStorage.setItem("edition-favorites", JSON.stringify([...set]));
      setIsFavorite(set.has(slug));
    } catch {}
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#090705] text-white min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#090705] via-[#0F0906] to-[#140B07]" />
        {Array.from({ length: 40 }).map((_, i) => {
          const seed = (n: number) => ((Math.sin(n * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-[#FFF2D8]"
              style={{
                left: `${seed(i) * 100}%`,
                top: `${seed(i + 100) * 100}%`,
                width: `${seed(i + 200) * 1.5 + 0.5}px`,
                height: `${seed(i + 200) * 1.5 + 0.5}px`,
                opacity: 0.3,
                animation: `twinkle ${seed(i + 300) * 3 + 2}s ease-in-out ${seed(i + 400) * 5}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* Breadcrumbs */}
      <div className="relative z-10 container-edit py-4">
        <nav className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-[#FFF2D8]/40">
          <Link to="/" search={{ category: undefined }} className="hover:text-[#E6C17D]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/editions" className="hover:text-[#E6C17D]">Editions</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#E6C17D]">{book.title}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[320px_1fr] gap-12 lg:gap-16 items-start">
          {/* Cover */}
          <div className="relative group mx-auto md:mx-0">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#F4B860]/15 to-[#C49752]/10 blur-2xl rounded-sm" />
            <div className="relative aspect-[2/3] max-w-[280px] mx-auto">
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-full h-full object-cover rounded-sm border border-[#E6C17D]/25 shadow-2xl shadow-[#F4B860]/10 group-hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 rounded-sm bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
            {/* Actions under cover */}
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={toggleFavorite}
                className="w-10 h-10 flex items-center justify-center border border-[#E6C17D]/25 rounded-sm hover:bg-[#E6C17D]/10 transition"
                aria-label="Wishlist"
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-[#E6C17D] text-[#E6C17D]" : "text-[#E6C17D]"}`} />
              </button>
              <button
                onClick={copyLink}
                className="w-10 h-10 flex items-center justify-center border border-[#E6C17D]/25 rounded-sm hover:bg-[#E6C17D]/10 transition"
                aria-label="Share"
              >
                {copied ? <Check className="h-4 w-4 text-[#E6C17D]" /> : <Share2 className="h-4 w-4 text-[#E6C17D]" />}
              </button>
              <button
                className="w-10 h-10 flex items-center justify-center border border-[#E6C17D]/25 rounded-sm hover:bg-[#E6C17D]/10 transition"
                aria-label="Bookmark"
              >
                <Bookmark className="h-4 w-4 text-[#E6C17D]" />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#E6C17D]/30 rounded-full">
              <BookOpen className="h-3 w-3 text-[#E6C17D]" />
              <span className="text-[0.6rem] uppercase tracking-[0.2em] text-[#E6C17D]">Edition {String(book.editionNumber).padStart(2, "0")} · {book.series}</span>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#FFF2D8]">{book.title}</h1>
            <p className="text-lg md:text-xl text-[#E6C17D]/80 font-serif italic">{book.subtitle}</p>

            <div className="flex items-center gap-3 pt-2">
              <img src={AUTHOR.logo} alt={AUTHOR.name} className="w-8 h-8 object-contain rounded-full border border-[#E6C17D]/20" />
              <span className="text-sm text-[#FFF2D8]/70">by <Link to="/editions" className="text-[#E6C17D] hover:underline">{AUTHOR.name}</Link></span>
            </div>

            <p className="text-sm text-[#FFF2D8]/60 leading-relaxed max-w-xl">{book.description}</p>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                { icon: Clock, label: "Reading Time", value: book.readingTime },
                { icon: Globe, label: "Language", value: book.language },
                { icon: Calendar, label: "Published", value: book.publicationDate.kindle },
                { icon: FileText, label: "Pages", value: book.pages.kindle },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2.5 p-3 border border-[#E6C17D]/15 rounded-sm bg-[#0F0906]/50">
                  <m.icon className="h-4 w-4 text-[#E6C17D]/60 shrink-0" />
                  <div>
                    <div className="text-[0.55rem] uppercase tracking-[0.15em] text-[#FFF2D8]/40">{m.label}</div>
                    <div className="text-xs text-[#FFF2D8]/80">{m.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Buy buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <a href={book.amazonLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#E6C17D] to-[#C49752] text-[#090705] text-xs font-medium uppercase tracking-widest rounded-sm hover:shadow-[0_0_25px_rgba(230,193,125,0.35)] transition-all">
                <ShoppingBag className="h-4 w-4" /> Buy on Amazon
              </a>
              <a href={book.books2ReadLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 border border-[#E6C17D]/40 text-[#E6C17D] text-xs font-medium uppercase tracking-widest rounded-sm hover:bg-[#E6C17D]/10 transition-all">
                Books2Read
              </a>
              <button className="inline-flex items-center gap-2 px-7 py-3.5 border border-[#E6C17D]/40 text-[#E6C17D] text-xs font-medium uppercase tracking-widest rounded-sm hover:bg-[#E6C17D]/10 transition-all">
                <Eye className="h-4 w-4" /> Read Sample
              </button>
            </div>

            {/* Formats */}
            <div className="flex flex-wrap gap-2 pt-2">
              {book.formats.map((f) => (
                <span key={f.type} className={`px-3 py-1 text-[0.6rem] uppercase tracking-widest border rounded-sm ${f.available ? "border-[#E6C17D]/30 text-[#E6C17D] bg-[#E6C17D]/5" : "border-[#FFF2D8]/10 text-[#FFF2D8]/30 line-through"}`}>
                  {f.type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Full Description */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionDivider label="About the Book" />
          <p className="text-sm md:text-base text-[#FFF2D8]/70 leading-relaxed whitespace-pre-line">{book.fullDescription}</p>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionDivider label="What You'll Learn" />
          <ul className="grid sm:grid-cols-2 gap-3">
            {book.whatYouWillLearn.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#FFF2D8]/70">
                <Check className="h-4 w-4 text-[#E6C17D] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Key Topics */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionDivider label="Key Topics" />
          <div className="flex flex-wrap gap-2">
            {book.keyTopics.map((t) => (
              <span key={t} className="px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.15em] border border-[#E6C17D]/20 text-[#E6C17D]/70 rounded-sm hover:border-[#E6C17D]/40 hover:text-[#E6C17D] transition">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionDivider label="Who Should Read This" />
          <ul className="space-y-3">
            {book.targetAudience.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#FFF2D8]/70">
                <User className="h-4 w-4 text-[#E6C17D]/60 shrink-0 mt-0.5" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why Read */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionDivider label="Why Read This Book" />
          <p className="text-sm md:text-base text-[#FFF2D8]/70 leading-relaxed">{book.whyRead}</p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionDivider label="Table of Contents" />
          <ol className="space-y-2">
            {book.tableOfContents.map((ch, i) => (
              <li key={i} className="flex items-baseline gap-4 border-b border-[#E6C17D]/10 pb-2">
                <span className="font-serif text-lg text-[#E6C17D]/50 tabular-nums w-8">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm text-[#FFF2D8]/70">{ch}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Reading Level */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionDivider label="Reading Level" />
          <p className="text-sm text-[#FFF2D8]/70 leading-relaxed">{book.readingLevel}</p>
        </div>
      </section>

      {/* Series Info */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <SectionDivider label="The Powerful Mind Series" />
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#E6C17D]/40 via-[#E6C17D]/20 to-transparent" />
            <div className="space-y-4">
              {BOOKS.map((b) => (
                <Link
                  key={b.slug}
                  to="/editions/$slug"
                  params={{ slug: b.slug }}
                  className={`relative flex items-center gap-4 pl-8 pr-4 py-3 border rounded-sm transition-all duration-500 ${b.slug === slug ? "border-[#E6C17D]/40 bg-[#E6C17D]/5" : "border-[#E6C17D]/15 bg-[#0F0906]/30 hover:border-[#E6C17D]/30 hover:bg-[#0F0906]/60"}`}
                >
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ${b.slug === slug ? "bg-[#E6C17D] shadow-[0_0_10px_rgba(230,193,125,0.5)]" : "bg-[#E6C17D]/30"}`} />
                  <img src={b.coverImage} alt={b.title} className="w-10 h-15 object-cover rounded-sm border border-[#E6C17D]/10" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E6C17D]/50">Book {b.seriesOrder}</div>
                    <div className={`font-serif text-sm font-bold truncate ${b.slug === slug ? "text-[#E6C17D]" : "text-[#FFF2D8]"}`}>{b.title}</div>
                  </div>
                  {b.slug === slug && <span className="text-[0.55rem] uppercase tracking-widest text-[#E6C17D]">Current</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Related Books */}
      {related.length > 0 && (
        <section className="relative z-10 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <SectionDivider label="Related Editions" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((b, i) => (
                <Link key={b.slug} to="/editions/$slug" params={{ slug: b.slug }} className="group animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-[#E6C17D]/15 group-hover:border-[#E6C17D]/40 transition-all duration-500">
                    <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  </div>
                  <h3 className="font-serif text-sm font-bold text-[#FFF2D8] mt-2 group-hover:text-[#E6C17D] transition-colors">{b.title}</h3>
                  <p className="text-[0.65rem] text-[#FFF2D8]/40 line-clamp-1">{b.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Author Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <SectionDivider label="About the Author" />
          <img src={AUTHOR.logo} alt={AUTHOR.name} className="w-24 h-24 object-contain rounded-full border border-[#E6C17D]/25 mx-auto mb-6" />
          <h3 className="font-serif text-3xl font-bold text-[#FFF2D8] mb-4">{AUTHOR.name}</h3>
          <p className="text-sm text-[#FFF2D8]/60 leading-relaxed">{AUTHOR.shortBio}</p>
          <div className="mt-6 p-6 border border-[#E6C17D]/20 rounded-sm bg-[#0F0906]/50">
            <p className="font-serif text-lg italic text-[#E6C17D]/90">"{AUTHOR.quote}"</p>
          </div>
        </div>
      </section>

      {/* Prev/Next */}
      <section className="relative z-10 py-12 px-4 border-t border-[#E6C17D]/10">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          {prevBook ? (
            <Link to="/editions/$slug" params={{ slug: prevBook.slug }} className="group flex items-center gap-3 p-4 border border-[#E6C17D]/15 rounded-sm hover:border-[#E6C17D]/40 transition flex-1">
              <ChevronLeft className="h-5 w-5 text-[#E6C17D]/40 group-hover:text-[#E6C17D] transition" />
              <div>
                <div className="text-[0.55rem] uppercase tracking-widest text-[#E6C17D]/50">Previous</div>
                <div className="font-serif text-sm text-[#FFF2D8] group-hover:text-[#E6C17D] transition">{prevBook.title}</div>
              </div>
            </Link>
          ) : <div className="flex-1" />}
          {nextBook ? (
            <Link to="/editions/$slug" params={{ slug: nextBook.slug }} className="group flex items-center gap-3 p-4 border border-[#E6C17D]/15 rounded-sm hover:border-[#E6C17D]/40 transition flex-1 text-right justify-end">
              <div>
                <div className="text-[0.55rem] uppercase tracking-widest text-[#E6C17D]/50">Next</div>
                <div className="font-serif text-sm text-[#FFF2D8] group-hover:text-[#E6C17D] transition">{nextBook.title}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#E6C17D]/40 group-hover:text-[#E6C17D] transition" />
            </Link>
          ) : <div className="flex-1" />}
        </div>
      </section>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-[#E6C17D]/40" />
      <span className="text-[0.7rem] uppercase tracking-[0.3em] text-[#E6C17D]">{label}</span>
      <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-[#E6C17D]/40" />
    </div>
  );
}
