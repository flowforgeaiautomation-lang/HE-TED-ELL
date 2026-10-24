import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Newspaper, Clock, TrendingUp, TrendingDown, Sun, Moon, Type,
  ArrowRight, Quote, CalendarDays, Camera, BarChart3, Globe, Sparkles,
  ChevronLeft, ChevronRight, List, X, Home,
} from "lucide-react";
import { getEpaperData, type EpaperData, type EpaperPage } from "@/lib/epaper.functions";
import { ScrollToTop } from "@/components/ScrollToTop";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import { fallbackCoverUrl } from "@/lib/article-images";
import { SmartImage } from "@/components/SmartImage";
import type { ArticleSummary } from "@/lib/types";

const editionQ = (date: string) =>
  queryOptions({
    queryKey: ["epaper", date],
    queryFn: () => getEpaperData({ data: { date } }),
  });

export const Route = createFileRoute("/edition/$date")({
  head: ({ params }) => ({
    meta: [
      { title: `Edition of ${params.date} — The United Hell` },
      { name: "description", content: `The Daily Discovery Edition from ${params.date}. Read the complete newspaper.` },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: `Edition of ${params.date} — The United Hell` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl(`/edition/${params.date}`) },
      { property: "og:image", content: SITE_LOGO },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(`/edition/${params.date}`) }],
  }),
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.prefetchQuery(editionQ(params.date));
    } catch {}
  },
  component: EditionDatePage,
  errorComponent: ({ error }) => (
    <div className="container-read py-20 text-center">
      <p className="dek">Could not load this edition: {error.message}</p>
      <Link to="/archive" className="text-sm underline mt-4 inline-block">Browse Archive</Link>
    </div>
  ),
});

function EditionDatePage() {
  const { date } = Route.useParams();
  const { data: epaper } = useSuspenseQuery(editionQ(date));

  const [currentPage, setCurrentPage] = useState(0);
  const [fontSize, setFontSize] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [isFlipping, setIsFlipping] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  const pages = epaper.pages;
  const page = pages[currentPage];
  const totalPages = pages.length;

  const goToPage = useCallback((idx: number) => {
    if (idx < 0 || idx >= totalPages || idx === currentPage) return;
    setFlipDirection(idx > currentPage ? "next" : "prev");
    setIsFlipping(true);
    setCurrentPage(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setIsFlipping(false), 400);
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextPage(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prevPage(); }
      if (e.key === "Escape") setShowToc(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextPage, prevPage]);

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) { if (dx < 0) nextPage(); else prevPage(); }
  }

  return (
    <div className="bg-background text-foreground min-h-screen epaper-root" style={{ fontSize: `${fontSize}rem` }}>
      <ScrollToTop />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-transparent">
        <div className="h-full bg-foreground transition-[width] duration-300" style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }} />
      </div>

      {/* Masthead */}
      <header className="border-b-2 rule">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <Link to="/archive" className="flex items-center gap-1.5 hover:text-foreground transition">
              <ChevronLeft className="h-3.5 w-3.5" /> Archive
            </Link>
            <span className="font-medium uppercase tracking-wider">Edition #{epaper.editionNumber}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              <div className="hidden md:block flex-1 border-t rule" />
              <Newspaper className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-widest">The Daily Discovery Edition</span>
              <Newspaper className="h-5 w-5 text-muted-foreground" />
              <div className="hidden md:block flex-1 border-t rule" />
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight">The United Hell</h1>
            <p className="text-sm text-muted-foreground mt-1">{epaper.dateDisplay}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
            <span className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> {epaper.weather.temp} · {epaper.weather.condition}</span>
            <span className="hidden sm:inline font-medium uppercase tracking-wider">Global Edition</span>
            <span>{epaper.totalArticles} Stories · {epaper.totalPages} Pages</span>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b rule sticky top-0 z-30 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-2 gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowToc(true)} className="p-2 hover:bg-muted rounded-sm transition flex items-center gap-1.5" aria-label="Table of Contents">
              <List className="h-4 w-4" /><span className="text-xs font-medium hidden sm:inline">Contents</span>
            </button>
            <Link to="/" className="p-2 hover:bg-muted rounded-sm transition" aria-label="Home"><Home className="h-4 w-4" /></Link>
          </div>
          <div className="text-center flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate block">
              {page?.sectionLabel} · Page {currentPage + 1} of {totalPages}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setFontSize((f) => Math.max(0.85, f - 0.05))} className="p-2 hover:bg-muted rounded-sm transition" aria-label="Smaller text"><Type className="h-3.5 w-3.5" /></button>
            <button onClick={() => setFontSize((f) => Math.min(1.3, f + 0.05))} className="p-2 hover:bg-muted rounded-sm transition" aria-label="Larger text"><Type className="h-5 w-5" /></button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => setDarkMode((d) => !d)} className="p-2 hover:bg-muted rounded-sm transition" aria-label="Toggle dark mode">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Page */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={currentPage} className={`epaper-page-flip ${isFlipping ? (flipDirection === "next" ? "flip-next" : "flip-prev") : ""}`}>
          {page && <PageContent page={page} epaper={epaper} />}
        </div>
      </div>

      {/* Nav */}
      <div className="border-t rule bg-background/95 backdrop-blur-md sticky bottom-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button onClick={prevPage} disabled={currentPage === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rule rounded-sm hover:bg-muted transition disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Previous</span>
          </button>
          <div className="flex items-center gap-1.5">
            {pages.map((p, i) => (
              <button key={i} onClick={() => goToPage(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? "bg-foreground w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"}`} aria-label={`Page ${i + 1}`} />
            ))}
          </div>
          <button onClick={nextPage} disabled={currentPage === totalPages - 1} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rule rounded-sm hover:bg-muted transition disabled:opacity-30 disabled:cursor-not-allowed">
            <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* TOC Drawer */}
      {showToc && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowToc(false)} />
          <div className="relative w-full max-w-md bg-background border-r rule h-full overflow-y-auto animate-slide-in-left">
            <div className="sticky top-0 bg-background border-b rule p-4 flex items-center justify-between">
              <h2 className="display-3">Table of Contents</h2>
              <button onClick={() => setShowToc(false)} className="p-2 hover:bg-muted rounded-sm"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-1">
              {pages.map((p, i) => (
                <button key={i} onClick={() => { goToPage(i); setShowToc(false); }} className={`w-full text-left px-4 py-3 rounded-sm transition flex items-center gap-4 ${i === currentPage ? "bg-muted font-medium" : "hover:bg-muted/50"}`}>
                  <span className="font-serif text-2xl text-muted-foreground tabular-nums w-10 shrink-0">{String(p.pageNumber).padStart(2, "0")}</span>
                  <div className="min-w-0"><div className="text-sm font-medium truncate">{p.sectionLabel}</div><div className="text-xs text-muted-foreground">{p.articles.length} stories</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t-2 rule py-12 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <img src={SITE_LOGO} alt={SITE_NAME} className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <p className="font-serif text-xl mb-2">The United Hell</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Beyond Headlines. Beyond Discovery.</p>
          <p className="text-xs text-muted-foreground">{epaper.dateDisplay} · Edition #{epaper.editionNumber} · {epaper.totalArticles} stories · {totalPages} pages</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/editions/epaper" className="hover:text-foreground transition">Today's Edition</Link>
            <Link to="/archive" className="hover:text-foreground transition">Archive</Link>
            <Link to="/" className="hover:text-foreground transition">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Page content (shared structure) ── */
function PageContent({ page, epaper }: { page: EpaperPage; epaper: EpaperData }) {
  if (page.isFrontPage) return <FrontPage page={page} epaper={epaper} />;
  if (page.isBackPage) return <BackPage page={page} epaper={epaper} />;
  return <SectionPageContent page={page} />;
}

function FrontPage({ page, epaper }: { page: EpaperPage; epaper: EpaperData }) {
  const hero = page.heroArticle;
  const top10 = page.articles.slice(1, 10);
  const breaking = epaper.breakingNews.slice(0, 3);

  return (
    <div className="space-y-8">
      {breaking.length > 0 && (
        <div className="bg-red-600 dark:bg-red-900 text-white px-4 py-2 rounded-sm flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-sm shrink-0">Breaking</span>
          <div className="overflow-hidden flex-1">
            <div className="flex gap-6 animate-marquee whitespace-nowrap">
              {breaking.map((a) => (<Link key={a.id} to="/article/$slug" params={{ slug: a.slug }} className="text-sm hover:underline">{a.title}</Link>))}
            </div>
          </div>
        </div>
      )}

      {hero && (
        <div className="border-b rule pb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" /> The Big Picture
          </div>
          <Link to="/article/$slug" params={{ slug: hero.slug }} preload="intent" className="group block">
            <div className="grid gap-6 md:grid-cols-12 items-start">
              <div className="md:col-span-8">
                <SmartImage src={hero.cover_image_url || fallbackCoverUrl(hero)} alt={hero.title} width={900} height={560} loading="eager" aspectClass="aspect-[16/10] w-full" className="rounded-sm" />
              </div>
              <div className="md:col-span-4 flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Story</span>
                <h2 className="font-serif text-2xl md:text-3xl font-bold leading-tight group-hover:underline decoration-1 underline-offset-4">{hero.title}</h2>
                {hero.dek && <p className="text-sm text-muted-foreground leading-relaxed">{hero.dek}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
                  {hero.read_time_minutes > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {hero.read_time_minutes} min</span>}
                  <span className="border-b border-foreground pb-0.5 font-medium text-foreground">Read full story</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between border-b rule pb-3 mb-5">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> Today's Top 10</h3>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{page.articles.length} stories</span>
        </div>
        <ol className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {top10.map((article, i) => (
            <li key={article.id} className="flex gap-3 border-b rule pb-3">
              <span className="font-serif text-xl text-muted-foreground tabular-nums leading-none w-7 shrink-0">{String(i + 2).padStart(2, "0")}</span>
              <Link to="/article/$slug" params={{ slug: article.slug }} className="font-serif text-sm md:text-base leading-snug hover:underline underline-offset-4 decoration-1">{article.title}</Link>
            </li>
          ))}
        </ol>
      </div>

      <DailyWidgets epaper={epaper} />
    </div>
  );
}

function SectionPageContent({ page }: { page: EpaperPage }) {
  const [hero, ...rest] = page.articles;
  if (!hero) return <div className="py-20 text-center"><Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">No articles in this section.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-foreground/20" />
        <div className="text-center"><div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{page.sectionKicker}</div><h2 className="font-serif text-3xl md:text-4xl font-bold mt-1">{page.sectionLabel}</h2></div>
        <div className="h-px flex-1 bg-foreground/20" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7"><ArticleCard article={hero} variant="hero" /></div>
        <div className="lg:col-span-5 grid gap-4 content-start">{rest.slice(0, 4).map((a) => <ArticleCard key={a.id} article={a} variant="compact" />)}</div>
      </div>
      {rest.length > 4 && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4">{rest.slice(4).map((a) => <ArticleCard key={a.id} article={a} variant="standard" />)}</div>}
      <div className="pt-4 border-t rule flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{page.articles.length} stories in {page.sectionLabel}</span>
        <Link to="/" search={{ category: page.sectionId }} className="text-sm font-medium border-b border-foreground pb-0.5 hover:opacity-70 transition flex items-center gap-1">More from {page.sectionLabel} <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </div>
  );
}

function BackPage({ page, epaper }: { page: EpaperPage; epaper: EpaperData }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-foreground/20" />
        <div className="text-center"><div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{page.sectionKicker}</div><h2 className="font-serif text-3xl md:text-4xl font-bold mt-1">Back Page</h2></div>
        <div className="h-px flex-1 bg-foreground/20" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{page.articles.map((a) => <ArticleCard key={a.id} article={a} variant="standard" />)}</div>
      <div className="border-t-2 rule pt-8 text-center max-w-2xl mx-auto">
        <Quote className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
        <blockquote className="font-serif text-2xl italic leading-snug mb-3">"{epaper.quoteOfDay.text}"</blockquote>
        <p className="text-sm text-muted-foreground">— {epaper.quoteOfDay.author}</p>
      </div>
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">End of Edition #{epaper.editionNumber} · {epaper.dateDisplay}</p>
        <Link to="/archive" className="mt-3 inline-flex items-center gap-2 text-sm font-medium border-b border-foreground pb-0.5 hover:opacity-70 transition">Browse Past Editions <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </div>
  );
}

function DailyWidgets({ epaper }: { epaper: EpaperData }) {
  const marketData = epaper.marketSnapshot.slice(0, 8);
  return (
    <section className="bg-muted/40 border-y rule py-8 -mx-4 px-4">
      <div className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">Daily Briefing — Data & Discovery</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="border rule p-4 bg-background rounded-sm">
          <div className="flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4 text-muted-foreground" /><h4 className="text-xs font-semibold uppercase tracking-wider">Market Snapshot</h4></div>
          <div className="space-y-1.5">
            {marketData.length === 0 ? <p className="text-xs text-muted-foreground">Loading live prices...</p> : marketData.map((m) => (
              <div key={m.symbol} className="flex items-center justify-between text-xs">
                <span className="font-medium truncate">{m.name}</span>
                <span className="flex items-center gap-1.5 tabular-nums shrink-0">
                  {m.available && m.price !== null ? (<><span>{m.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span><span className={m.change !== null && m.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{m.change_percent !== null ? `${m.change >= 0 ? "+" : ""}${m.change_percent.toFixed(2)}%` : ""}</span>{m.change !== null && m.change >= 0 ? <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" /> : <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />}</>) : <span className="text-muted-foreground">—</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="border rule p-4 bg-background rounded-sm">
          <div className="flex items-center gap-2 mb-3"><Quote className="h-4 w-4 text-muted-foreground" /><h4 className="text-xs font-semibold uppercase tracking-wider">Quote of the Day</h4></div>
          <blockquote className="font-serif text-base italic leading-snug mb-2">"{epaper.quoteOfDay.text}"</blockquote>
          <p className="text-xs text-muted-foreground">— {epaper.quoteOfDay.author}</p>
        </div>
        <div className="border rule p-4 bg-background rounded-sm">
          <div className="flex items-center gap-2 mb-3"><CalendarDays className="h-4 w-4 text-muted-foreground" /><h4 className="text-xs font-semibold uppercase tracking-wider">Today in History</h4></div>
          <p className="text-sm leading-relaxed">{epaper.thisDayHistory[0]}</p>
        </div>
        <div className="border rule p-4 bg-background rounded-sm overflow-hidden">
          <div className="flex items-center gap-2 mb-3"><Camera className="h-4 w-4 text-muted-foreground" /><h4 className="text-xs font-semibold uppercase tracking-wider">Photo of the Day</h4></div>
          {epaper.photoOfDay.url ? (<><SmartImage src={epaper.photoOfDay.url} alt={epaper.photoOfDay.caption} width={300} height={200} loading="lazy" aspectClass="w-full aspect-[3/2]" className="rounded-sm mb-2" /><p className="text-xs text-muted-foreground line-clamp-2">{epaper.photoOfDay.caption}</p></>) : <p className="text-xs text-muted-foreground">Today's featured photo is being selected.</p>}
        </div>
      </div>
    </section>
  );
}

function ArticleCard({ article, variant = "standard" }: { article: ArticleSummary; variant?: "hero" | "compact" | "standard" }) {
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  if (variant === "hero") return (
    <Link to="/article/$slug" params={{ slug: article.slug }} preload="intent" className="group block">
      <SmartImage src={cover} alt={article.title} width={700} height={440} loading="eager" aspectClass="aspect-[16/10] w-full" className="rounded-sm mb-4" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{article.category}</span>
      <h3 className="font-serif text-xl md:text-2xl font-bold leading-tight mt-1 group-hover:underline decoration-1 underline-offset-4">{article.title}</h3>
      {article.dek && <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{article.dek}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">{article.read_time_minutes > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {article.read_time_minutes} min</span>}<span className="border-b border-foreground pb-0.5 font-medium text-foreground">Continue reading</span><ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" /></div>
    </Link>
  );
  if (variant === "compact") return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group flex gap-3 border-b rule pb-3">
      <div className="w-20 h-20 shrink-0 overflow-hidden rounded-sm"><SmartImage src={cover} alt={article.title} width={80} height={80} loading="lazy" aspectClass="w-full h-full object-cover" /></div>
      <div className="min-w-0 flex-1"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{article.category}</span><h4 className="font-serif text-sm font-bold leading-snug mt-0.5 group-hover:underline decoration-1 underline-offset-2 line-clamp-2">{article.title}</h4>{article.read_time_minutes > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {article.read_time_minutes} min</span>}</div>
    </Link>
  );
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group block">
      <SmartImage src={cover} alt={article.title} width={400} height={250} loading="lazy" aspectClass="aspect-[16/10] w-full" className="rounded-sm mb-3" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{article.category}</span>
      <h4 className="font-serif text-base font-bold leading-snug mt-1 group-hover:underline decoration-1 underline-offset-4 line-clamp-2">{article.title}</h4>
      {article.dek && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.dek}</p>}
      {article.read_time_minutes > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><Clock className="h-3 w-3" /> {article.read_time_minutes} min read</span>}
    </Link>
  );
}
