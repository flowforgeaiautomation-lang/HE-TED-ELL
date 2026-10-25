import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Newspaper, Library, ArrowRight, ExternalLink, Sparkles, TrendingUp, Clock } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageEndAd } from "@/components/ads/EzoicAd";
import { fallbackCoverUrl } from "@/lib/article-images";

export const Route = createFileRoute("/discovery")({
  head: () => ({
    meta: [
      { title: "Daily Discovery — The United Hell" },
      { name: "description", content: "Your daily discovery of books, newspapers, and curated reading from The United Hell." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Daily Discovery — The United Hell" },
      { property: "og:description", content: "Explore books, newspapers, and curated reading recommendations." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/discovery") },
      { property: "og:image", content: SITE_LOGO },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/discovery") }],
  }),
  component: DiscoveryPage,
});

const FEATURED_BOOKS = [
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    category: "History",
    description: "A sweeping narrative of how Homo sapiens came to dominate the Earth, from the Stone Age to the digital era.",
    cover: "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=600",
    rating: 4.8,
    readers: "12M+",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self-Improvement",
    description: "A proven framework for getting 1% better every day — tiny changes, remarkable results.",
    cover: "https://images.pexels.com/photos/235294/pexels-photo-235294.jpeg?auto=compress&cs=tinysrgb&w=600",
    rating: 4.9,
    readers: "8M+",
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    category: "Psychology",
    description: "A landmark exploration of the two systems that drive the way we think and make decisions.",
    cover: "https://images.pexels.com/photos/3747139/pexels-photo-3747139.jpeg?auto=compress&cs=tinysrgb&w=600",
    rating: 4.7,
    readers: "6M+",
  },
  {
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt & David Thomas",
    category: "Technology",
    description: "Your journey to mastery — practical advice for writing better code and building a successful career.",
    cover: "https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg?auto=compress&cs=tinysrgb&w=600",
    rating: 4.8,
    readers: "3M+",
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    description: "From the Big Bang to black holes — one of the most accessible science books ever written.",
    cover: "https://images.pexels.com/photos/2156881/pexels-photo-2156881.jpeg?auto=compress&cs=tinysrgb&w=600",
    rating: 4.7,
    readers: "10M+",
  },
  {
    title: "The Art of War",
    author: "Sun Tzu",
    category: "Strategy",
    description: "Ancient wisdom on strategy, leadership, and conflict resolution that remains relevant today.",
    cover: "https://images.pexels.com/photos/2602861/pexels-photo-2602861.jpeg?auto=compress&cs=tinysrgb&w=600",
    rating: 4.6,
    readers: "15M+",
  },
];

const OUR_NEWSPAPER = {
  name: "The Daily Discovery",
  tagline: "Beyond Headlines. Beyond Discovery.",
  description:
    "Your daily digital newspaper featuring the world's most important stories, science, innovation, and knowledge — curated daily for the curious reader.",
  to: "/epaper" as const,
};

function DiscoveryPage() {
  const [activeTab, setActiveTab] = useState<"books" | "newspapers">("books");

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="border-b rule bg-background/95 backdrop-blur-xl sticky top-0 z-30">
        <div className="container-edit py-6 text-center">
          <div className="kicker text-xs mb-2">Curated Daily</div>
          <h1 className="display-1">Daily Discovery</h1>
          <p className="dek mt-4 max-w-2xl mx-auto">
            Books worth reading, newspapers worth following, and stories worth your time.
          </p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="container-edit pt-8">
        <div className="flex justify-center gap-3 mb-10">
          <button
            onClick={() => setActiveTab("books")}
            className={`flex items-center gap-2 px-5 py-2.5 border rule text-xs uppercase tracking-widest transition rounded-full ${
              activeTab === "books" ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Bookshelf
          </button>
          <button
            onClick={() => setActiveTab("newspapers")}
            className={`flex items-center gap-2 px-5 py-2.5 border rule text-xs uppercase tracking-widest transition rounded-full ${
              activeTab === "newspapers" ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"
            }`}
          >
            <Newspaper className="h-4 w-4" />
            Newspapers
          </button>
          <Link
            to="/editions"
            className="flex items-center gap-2 px-5 py-2.5 border rule text-xs uppercase tracking-widest transition rounded-full hover:bg-foreground/10"
          >
            <Library className="h-4 w-4" />
            Archive
          </Link>
          <Link
            to="/discover"
            className="flex items-center gap-2 px-5 py-2.5 border border-foreground bg-foreground text-background text-xs uppercase tracking-widest transition rounded-full hover:bg-transparent hover:text-foreground"
          >
            <Sparkles className="h-4 w-4" />
            Managed Content
          </Link>
        </div>

        {/* Our Newspaper — always shown first, before tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="mb-6 flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            <h2 className="display-3">Our Newspaper</h2>
          </div>
          <Link
            to={OUR_NEWSPAPER.to}
            className="group flex flex-col sm:flex-row items-stretch gap-0 sm:gap-8 border rule rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-foreground/30 bg-card/60 backdrop-blur-sm"
          >
            <div className="relative aspect-[3/4] sm:aspect-[2/3] w-full sm:w-56 md:w-64 shrink-0 bg-foreground flex items-center justify-center overflow-hidden">
              <Newspaper className="h-16 w-16 text-background" />
              <div className="absolute bottom-3 left-3 right-3 text-center">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-background/80 border border-background/30 px-2 py-0.5">Live Daily</span>
              </div>
            </div>
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-foreground font-semibold">Daily Edition</span>
                <span className="text-[0.55rem] uppercase tracking-[0.15em] text-foreground border border-foreground px-1.5 py-0.5">Live</span>
              </div>
              <h3 className="font-serif text-2xl md:text-3xl font-bold leading-tight group-hover:underline decoration-1 underline-offset-4">
                {OUR_NEWSPAPER.name}
              </h3>
              <p className="font-serif italic text-muted-foreground mt-1">{OUR_NEWSPAPER.tagline}</p>
              <p className="text-sm text-foreground/80 leading-relaxed mt-3 max-w-xl">
                {OUR_NEWSPAPER.description}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 text-[0.65rem] text-muted-foreground">
                <span>Updated Daily</span>
                <span>·</span>
                <span>English</span>
                <span>·</span>
                <span>Premium</span>
              </div>
              <span className="inline-flex items-center gap-1.5 mt-5 text-xs font-medium border-b border-foreground pb-0.5 transition-all group-hover:gap-2.5 self-start">
                Read today's edition
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </motion.div>

        {/* Books tab */}
        {activeTab === "books" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <h2 className="display-3">Featured Books</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURED_BOOKS.map((book, i) => (
                <motion.article
                  key={book.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="group overflow-hidden rounded-lg border rule bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <SmartImage
                      src={book.cover}
                      alt={book.title}
                      width={400}
                      height={533}
                      loading={i < 3 ? "eager" : "lazy"}
                      aspectClass="w-full h-full"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 rounded-full bg-background/85 backdrop-blur-md px-2.5 py-1 text-xs font-medium">
                      {book.rating} / 5
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <span className="kicker text-[0.65rem]">{book.category}</span>
                    <h3 className="font-serif text-lg leading-snug group-hover:underline decoration-1 underline-offset-4">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">by {book.author}</p>
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                      {book.description}
                    </p>
                    <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {book.readers} readers
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>
        )}

        {/* Newspapers tab — only our own Daily Discovery edition */}
        {activeTab === "newspapers" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8 flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              <h2 className="display-3">The Daily Discovery</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl mb-6 leading-relaxed">
              Our own daily digital newspaper — no other newspapers, just The Daily Discovery Edition, updated every day.
            </p>
            <Link
              to={OUR_NEWSPAPER.to}
              className="group flex items-center justify-between border rule p-6 rounded-lg transition-all duration-300 hover:shadow-md hover:border-foreground/30 hover:bg-foreground/[0.02]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl group-hover:underline decoration-1 underline-offset-4">
                    {OUR_NEWSPAPER.name}
                  </h3>
                  <span className="text-[0.55rem] uppercase tracking-[0.15em] text-foreground border border-foreground px-1.5 py-0.5">Live</span>
                </div>
                <p className="font-serif italic text-sm text-muted-foreground">{OUR_NEWSPAPER.tagline}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>Updated Daily</span>
                  <span>·</span>
                  <span className="kicker text-[0.6rem]">Daily Edition</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 shrink-0" />
            </Link>
          </motion.div>
        )}

        {/* CTA to explore all TUH content */}
        <div className="mt-16 text-center border-t rule pt-12">
          <h2 className="display-3 mb-4">Explore More from The United Hell</h2>
          <p className="dek max-w-xl mx-auto mb-6">
            Discover original journalism, daily briefings, editions, and curated stories across every category.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              to="/today"
              className="inline-flex items-center gap-2 border border-foreground px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-full"
            >
              Today's Stories
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 border rule px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-foreground/10 transition rounded-full"
            >
              Discover All
            </Link>
            <Link
              to="/briefing"
              className="inline-flex items-center gap-2 border rule px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-foreground/10 transition rounded-full"
            >
              Daily Briefing
            </Link>
          </div>
        </div>
      </div>

      <ScrollToTop />
      <PageEndAd />
    </div>
  );
}
