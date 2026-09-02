import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getArticleBySlug, getRelated, listComments, postReflection, bumpLike, getLikedComments, deleteCommentAnon } from "@/lib/articles.functions";


import { ArticleActions } from "@/components/article-actions";
import { ArticleCard } from "@/components/article-card";
import { categoryLabel } from "@/lib/categories";

import { toast } from "sonner";
import { motion } from "framer-motion";
import { Quote, Lightbulb, Clock, TrendingUp, Users, Building2, Globe2, Hash, Sparkles, Info, Bookmark, ChevronRight, ArrowBigUp, MessageCircle, CornerDownRight, Trash2 } from "lucide-react";
import type { CommentRow, ArticleStory, KeyNumber, PersonInvolved, OrganizationInvolved, CountryInvolved, VocabEntry } from "@/lib/types";
import { SmartImage } from "@/components/SmartImage";
import { ReadingExperience } from "@/components/ReadingExperience";
import { ArticleAudioPlayer } from "@/components/ArticleAudioPlayer";
import { ArticleTranslateControl, type ArticleTranslateState } from "@/components/ArticleTranslateControl";
import { useReadingPrefs } from "@/hooks/use-reading-prefs";
import { useLiveTranslation } from "@/hooks/use-live-translation";
import { ImageCarousel } from "@/components/ImageCarousel";
import { MediaCarousel, type MediaItem } from "@/components/MediaCarousel";
import { fallbackCoverUrl } from "@/lib/article-images";
import { WordSearch } from "@/components/word-search";
import { KnowledgeCheck } from "@/components/KnowledgeCheck";
import { EnhancedVocabCard } from "@/components/EnhancedVocabCard";
import { canonicalUrl, articleUrl, newsArticleJsonLd, breadcrumbJsonLd, SITE_NAME, SITE_LOGO, SITE_URL } from "@/lib/seo";
import { ArticleEndAd } from "@/components/ads/EzoicAd";

const articleQ = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: () => getArticleBySlug({ data: { slug } }),
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });



export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    try {
      const a = await context.queryClient.ensureQueryData(articleQ(params.slug));
      if (!a) throw notFound();
      return { article: a };
    } catch (e) {
      if (e && typeof e === 'object' && 'status' in e && (e as any).status === 404) throw e;
      try {
        throw notFound();
      } catch (e2) {
        if (e2 && typeof e2 === 'object' && 'status' in e2 && (e2 as any).status === 404) throw e2;
        console.error("[article loader] SSR fallback failed:", e2);
        return { article: null };
      }
    }
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a)
      return {
        meta: [
          { title: "Story not found — The United Hell" },
        ],
      };
    const url = articleUrl(a.slug);
    const img = a.cover_image_url || SITE_LOGO;
    return {
      meta: [
        { title: `${a.title} — ${SITE_NAME}` },
        { name: "description", content: a.dek ?? a.title },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.dek ?? a.title },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: img },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: a.title },
        { name: "twitter:description", content: a.dek ?? a.title },
        { name: "twitter:image", content: img },
        { name: "article:published_time", content: a.published_at },
        { name: "article:section", content: a.category },
      ],
      links: [
        { rel: "canonical", href: url },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(newsArticleJsonLd(a)),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd([
            { name: SITE_NAME, url: SITE_URL },
            { name: a.category, url: canonicalUrl(`/search?q=${encodeURIComponent(a.category)}`) },
            { name: a.title, url },
          ])),
        },
      ],
    };
  },
  component: ArticlePage,
  errorComponent: ({ error }) => (
    <div className="container-read py-24 text-center">
      <p className="dek">We couldn't load this story. {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-read py-24 text-center">
      <div className="kicker">Missing</div>
      <h1 className="display-1 mt-3">This story isn't here.</h1>
      <Link to="/" search={{ category: undefined }} className="mt-6 inline-block kicker hover:opacity-60">← Front page</Link>
    </div>
  ),
});

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function ReadingProgress() {
  const progress = useScrollProgress();
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-foreground transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: article, isError, refetch } = useQuery(articleQ(slug));
  const articleContentRef = useRef<HTMLElement>(null);
  const [translation, setTranslation] = useState<ArticleTranslateState | null>(null);

  // All hooks must run unconditionally before any early return,
  // otherwise React throws error #310 (hooks called conditionally).
  const relatedQuery = useQuery({
    queryKey: ["related", article?.category ?? "", article?.slug ?? ""],
    queryFn: () => getRelated({ data: { category: article!.category, excludeSlug: article!.slug } }),
    enabled: !!article,
  });

  const { prefs } = useReadingPrefs();
  useLiveTranslation();

  const displayTitle = translation?.title ?? article?.title;
  const displayDek = translation ? translation.dek : article?.dek;
  const displayStory = translation ? (translation.story ?? {}) : (article?.story ?? {});

  if (isError) {
    return (
      <div className="container-read py-24 text-center">
        <div className="kicker">Connection issue</div>
        <h1 className="display-2 mt-3">Couldn't load this story.</h1>
        <p className="dek mt-3">A temporary error occurred. Please try again.</p>
        <button
          onClick={() => refetch()}
          className="mt-6 border border-foreground px-5 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
        >
          Try again
        </button>
        <Link to="/" search={{ category: undefined }} className="mt-3 block kicker hover:opacity-60">← Front page</Link>
      </div>
    );
  }
  if (!article) return null;
  const story = displayStory;
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  const articleMedia: MediaItem[] = [
    { type: "image" as const, src: cover, alt: displayTitle },
  ];
  const related = relatedQuery.data ?? [];

  const tags = (article as any).tags || (story as any).tags || [];

  const addedDate = (article as any).created_at
    ? new Date((article as any).created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <article>
      <ReadingProgress />

      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        className="container-read pt-10 md:pt-16 text-center"
      >
        <div className="kicker">{categoryLabel(article.category)}</div>
        <h1 className="display-1 mt-5">{displayTitle}</h1>
        {displayDek && <p className="dek mt-6 text-balance">{displayDek}</p>}
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
          {addedDate && <span>{addedDate}</span>}

        </div>
        <div className="mt-6 flex justify-center gap-2">
          <ArticleActions articleId={article.id} title={displayTitle} />
          <ArticleTranslateControl
            slug={article.slug}
            originalTitle={article.title}
            originalDek={article.dek}
            originalBody={undefined}
            originalStory={article.story}
            onTranslate={setTranslation}
          />
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="container-edit mt-10"
      >
        <MediaCarousel media={articleMedia} alt={article.title} priority />
      </motion.div>

      {/* Story Mode */}
      <section ref={articleContentRef} className="container-read py-12 md:py-16 article-content">
        <div className="article-content grid gap-10">
          <StoryBlock label="Quick Summary" body={story.summary} />
          <StoryBlock label="The Story" body={story.main_story} />

          {story.what_happened && <StoryBlock label="What Happened" body={story.what_happened} />}
          {story.why_it_matters && <StoryBlock label="Why It Matters" body={story.why_it_matters} />}
          {story.how_it_happened && <StoryBlock label="How It Happened" body={story.how_it_happened} />}
          {story.who_and_where && <StoryBlock label="Who & Where" body={story.who_and_where} />}
          {story.what_came_before && <StoryBlock label="What Came Before" body={story.what_came_before} />}
          {story.what_happens_next && <StoryBlock label="What Happens Next" body={story.what_happens_next} />}

          {/* Also Read — always visible, placed before Key Developments */}
          {related.length > 0 && (
            <div className="border-t rule pt-8">
              <div className="kicker mb-6">Also Read</div>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <a
                      href={`/article/${a.slug}`}
                      className="group flex flex-col gap-2 hover-lift cursor-pointer"
                    >
                      <SmartImage
                        src={a.cover_image_url || fallbackCoverUrl(a)}
                        alt={a.title}
                        width={400}
                        height={300}
                        loading="eager"
                        aspectClass="w-full"
                        className="rounded-sm"
                      />
                      <span className="kicker">{categoryLabel(a.category)}</span>
                      <h3 className="font-serif text-lg leading-snug group-hover:underline decoration-1 underline-offset-4">
                        {a.title}
                      </h3>
                      {a.dek && <p className="text-sm text-muted-foreground line-clamp-2">{a.dek}</p>}

                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {story.key_facts && story.key_facts.length > 0 && (
            <ListBlock label="Key Facts" items={story.key_facts} />
          )}

          {story.key_developments && story.key_developments.length > 0 && (
            <KeyDevelopmentsBlock items={story.key_developments} />
          )}

          {story.quick_insights && story.quick_insights.length > 0 && (
            <ListBlock label="Quick Insights" items={story.quick_insights} />
          )}

          {story.expert_analysis && <StoryBlock label="Interesting Insight" body={story.expert_analysis} />}

          {story.did_you_know && (
            <DidYouKnowBlock fact={story.did_you_know} />
          )}

          {story.historical_context && (
            <StoryBlock label="Historical Context" body={story.historical_context} />
          )}

          {story.future_outlook && (
            <StoryBlock label="Future Outlook" body={story.future_outlook} />
          )}

          {story.reader_takeaways && story.reader_takeaways.length > 0 && (
            <ListBlock label="Reader Takeaways" items={story.reader_takeaways} />
          )}

          {story.timeline && story.timeline.length > 0 && (
            <TimelineBlock items={story.timeline} />
          )}

          {story.key_numbers && story.key_numbers.length > 0 && (
            <KeyNumbersBlock items={story.key_numbers} />
          )}

          {story.people && story.people.length > 0 && (
            <PeopleBlock people={story.people} />
          )}

          {story.organizations && story.organizations.length > 0 && (
            <OrganizationsBlock orgs={story.organizations} />
          )}

          {story.countries && story.countries.length > 0 && (
            <CountriesBlock countries={story.countries} />
          )}

          {tags.length > 0 && <RelatedTopics tags={tags} />}

          <ClosingTakeaway story={story} />
        </div>

        {/* Interactive features (outside article-content for Journey compatibility) */}
        <div className="grid gap-10 mt-10">
          <div className="border-y rule py-10">
            <div className="kicker mb-6">Vocabulary Builder</div>
              {story.vocabulary && story.vocabulary.length > 0 ? (
                <div className="grid gap-6">
                  {enhanceVocabEntries(story.vocabulary).map((v, i) => (
                    <EnhancedVocabCard key={`${v.word}-${i}`} entry={v} articleId={article.id} index={i} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-6">
                  {generateLocalVocabFallback(story.summary || story.main_story || article.dek || article.title || "").map((v, i) => (
                    <EnhancedVocabCard key={`${v.word}-${i}`} entry={v} articleId={article.id} index={i} />
                  ))}
                </div>
              )}

              <WordSearch />
            </div>

          {prefs.enableQuizzes && (
            <KnowledgeCheckReflection articleId={article.id} story={story} title={article.title} />
          )}
        </div>

        <div className="mt-12 flex justify-center gap-2">
          <ArticleActions articleId={article.id} title={displayTitle} />
          <ArticleTranslateControl
            slug={article.slug}
            originalTitle={article.title}
            originalDek={article.dek}
            originalBody={undefined}
            originalStory={article.story}
            onTranslate={setTranslation}
          />
        </div>

      </section>

      <ReadingExperience
        articleSlug={article.slug}
        articleContentRef={articleContentRef}
        articleTitle={displayTitle}
        articleSections={story.sections?.map((s: any, i: number) => ({ id: `section-${i}`, label: s.heading || s.title || `Section ${i + 1}` })) || []}
      />
      <ArticleAudioPlayer articleContentRef={articleContentRef} articleTitle={displayTitle} />

      {/* Comments */}
      <Discussion articleId={article.id} />

      {/* Ezoic Ad — only at article end, after all editorial content */}
      <ArticleEndAd />

    </article>
  );
}

function StoryBlock({ label, body }: { label: string; body?: string }) {
  if (!body) return null;
  const paragraphs = body.split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div>
      {label && <div className="kicker mb-3">{label}</div>}
      <div className="grid gap-5">
        {paragraphs.map((paragraph, index) => {
          if (paragraph.startsWith("> ") || paragraph.startsWith('"')) {
            const quoteText = paragraph.replace(/^>\s*/, "").replace(/^"|"$/g, "");
            return <PullQuote key={index} text={quoteText} />;
          }
          const isQuestionHeading =
            paragraph.length < 120 &&
            paragraph.endsWith("?") &&
            !paragraph.includes(". ") &&
            /^[A-Z]/.test(paragraph);
          if (isQuestionHeading) {
            return (
              <h3
                key={index}
                className="font-serif text-2xl md:text-3xl font-bold leading-tight mt-4 scroll-mt-4"
              >
                {paragraph}
              </h3>
            );
          }
          return (
            <p key={index} className="font-serif text-xl md:text-2xl leading-snug">{paragraph}</p>
          );
        })}
      </div>
    </div>
  );
}

function PullQuote({ text }: { text: string }) {
  return (
    <blockquote className="my-8 border-l-[3px] border-foreground pl-6 md:pl-8">
      <p className="font-serif text-2xl md:text-3xl leading-tight italic text-foreground/90">
        {text}
      </p>
    </blockquote>
  );
}

function InfoBox({ label, body, icon = "info" }: { label: string; body?: string; icon?: "info" | "lightbulb" | "sparkles" }) {
  if (!body) return null;
  const Icon = icon === "lightbulb" ? Lightbulb : icon === "sparkles" ? Sparkles : Info;
  return (
    <div className="border-t rule pt-8">
      <div className="rounded-lg border rule bg-foreground/[0.02] p-6 md:p-8">
        <div className="kicker mb-4 flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="grid gap-4">
          {body.split(/\n{2,}|\r?\n/).map((p, i) => (
            <p key={i} className="font-serif text-lg md:text-xl leading-relaxed text-foreground/90">{p.trim()}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function KeyDevelopmentsBlock({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-6">Key Developments</div>
      <div className="grid gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="group flex gap-5 rounded-lg border rule p-5 md:p-6 transition-all duration-300 hover:bg-foreground/[0.02] hover:border-foreground/30"
          >
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border rule font-serif text-lg text-foreground/80 transition-colors group-hover:border-foreground group-hover:text-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <p className="font-serif text-lg md:text-xl leading-snug pt-1.5">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineBlock({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-6">Timeline</div>
      <div className="relative pl-8">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-foreground/20" />
        <div className="grid gap-6">
          {items.map((item, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-8 top-1.5 h-3 w-3 rounded-full border-2 border-foreground bg-background" />
              <p className="font-serif text-lg leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClosingTakeaway({ story }: { story: ArticleStory }) {
  const takeaway = story.reader_takeaways?.[0] || story.what_happens_next;
  if (!takeaway) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="rounded-lg border rule bg-foreground/[0.03] p-6 md:p-8">
        <div className="kicker mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4" /> The Bottom Line</div>
        <p className="font-serif text-xl md:text-2xl leading-relaxed text-foreground/90">{takeaway}</p>
      </div>
    </div>
  );
}

function RelatedTopics({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-4">Related Topics</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            to="/search"
            search={{ q: tag }}
            className="group inline-flex items-center gap-1 rounded-full border rule px-4 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:border-foreground hover:text-foreground"
          >
            {tag}
            <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-4">{label}</div>
      <ul className="grid gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 font-serif text-lg leading-snug">
            <span className="text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeyNumbersBlock({ items }: { items: KeyNumber[] }) {
  if (!items?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-4 flex items-center gap-2"><Hash className="h-4 w-4" /> Key Numbers</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((kn, i) => (
          <div key={i} className="border rule p-5 transition-colors hover:border-foreground/30">
            <div className="font-serif text-3xl mb-1">{kn.value}</div>
            {kn.label && <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{kn.label}</div>}
            {kn.explanation && <p className="text-sm text-foreground/70 leading-relaxed">{kn.explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PeopleBlock({ people }: { people: PersonInvolved[] }) {
  if (!people?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> People Involved</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {people.map((p, i) => (
          <div key={i} className="border rule p-5 transition-colors hover:border-foreground/30">
            <h3 className="font-serif text-xl mb-1">{p.name}</h3>
            {p.role && <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{p.role}</div>}
            {p.contribution && <p className="text-sm text-foreground/80 leading-relaxed mb-1">{p.contribution}</p>}
            {p.importance && <p className="text-sm text-muted-foreground leading-relaxed">{p.importance}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrganizationsBlock({ orgs }: { orgs: OrganizationInvolved[] }) {
  if (!orgs?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-4 flex items-center gap-2"><Building2 className="h-4 w-4" /> Organizations</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {orgs.map((o, i) => (
          <div key={i} className="border rule p-5 transition-colors hover:border-foreground/30">
            <h3 className="font-serif text-xl mb-1">{o.name}</h3>
            {o.explanation && <p className="text-sm text-foreground/70 leading-relaxed">{o.explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CountriesBlock({ countries }: { countries: CountryInvolved[] }) {
  if (!countries?.length) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="kicker mb-4 flex items-center gap-2"><Globe2 className="h-4 w-4" /> Countries</div>
      <div className="flex flex-wrap gap-2">
        {countries.map((c, i) => (
          <div key={i} className="border rule px-4 py-2">
            <span className="font-serif text-base">{c.name}</span>
            {c.role && <span className="text-sm text-muted-foreground ml-2">— {c.role}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DidYouKnowBlock({ fact }: { fact: string }) {
  if (!fact) return null;
  return (
    <div className="border-t rule pt-8">
      <div className="rounded-xl border rule bg-foreground/[0.02] p-6">
        <div className="kicker mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Did You Know?</div>
        <p className="font-serif text-lg leading-relaxed">{fact}</p>
      </div>
    </div>
  );
}

function EntityBlock({ people, organizations, countries }: { people?: string[]; organizations?: string[]; countries?: string[] }) {
  const groups = [
    { label: "People mentioned", items: people },
    { label: "Organizations mentioned", items: organizations },
    { label: "Countries mentioned", items: countries },
  ].filter((g) => g.items?.length);
  if (!groups.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-3 border-t rule pt-8">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="kicker mb-3">{g.label}</div>
          <div className="flex flex-wrap gap-2">
            {g.items!.map((item) => <span key={item} className="border rule px-2 py-1 text-xs">{item}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","must","can","this","that","these","those","i","you","he","she","it","we","they","me","him","her","us","them","my","your","his","its","our","their","what","which","who","whom","whose","when","where","why","how","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","just","as","if","about","against","between","into","through","during","before","after","above","below","up","down","out","off","over","under","again","further","then","once","here","there","also","said","says","one","two","three","new","said","also","news","report","according","image","photo","getty","reuters","ap","afp","caption","via","advertisement","story","article","read","more","click","subscribe","sign","up","log","in","out","up","down","like","back","make","made","get","got","go","went","take","took","come","came","see","saw","know","knew","think","thought","say","said","told","tell","tells","telling","week","day","year","month","time","today","yesterday","tomorrow","now","then","still","even","well","much","many","such","very","too","so","just","only","also","always","never","often","sometimes","usually","rarely","here","there","where","when","why","how","what","who","which","whose","whom","percent","million","billion","thousand","hundred","people","person","group","world","country","nations","united","states","state","government","president","minister","leader","official","spokesman","spokeswoman","police","military","army","forces","war","attack","strike","crisis","conflict","issue","problem","solution","plan","policy","law","rule","order","court","judge","case","trial","charge","arrest","kill","killed","death","die","died","injure","injured","wound","wounded","damage","destroy","destroyed","loss","lost","win","won","victory","defeat","fail","failed","failure","success","successful","achieve","achieved","goal","target","aim","purpose","reason","cause","effect","result","impact","change","changed","reform","improve","improved","better","best","good","bad","great","small","large","big","little","high","low","long","short","fast","slow","old","new","young","early","late","first","last","next","previous","former","current","present","past","future","local","national","international","global","public","private","general","specific","particular","certain","sure","clear","unclear","simple","complex","easy","difficult","hard","soft","strong","weak","power","powerful","important","significant","major","minor","main","key","central","primary","secondary","final","initial","original","recent","latest","current","modern","traditional","old","new","right","left","center","middle","side","end","start","begin","beginning","close","closed","open","opened","full","empty","complete","incomplete","whole","part","half","quarter","third","section","area","region","zone","place","location","city","town","village","capital","district","neighborhood","street","road","avenue","building","house","home","office","room","space","land","field","farm","forest","mountain","river","lake","sea","ocean","water","air","fire","earth","ground","sky","weather","rain","snow","wind","storm","cloud","sun","moon","star","light","dark","day","night","morning","evening","afternoon","today","tonight","weekend","holiday","season","spring","summer","autumn","fall","winter","january","february","march","april","may","june","july","august","september","october","november","december","monday","tuesday","wednesday","thursday","friday","saturday","sunday","am","pm","hour","minute","second","moment","while","since","until","till","during","through","throughout","across","along","around","about","above","below","beside","behind","beyond","within","without","among","between","against","toward","towards","upon","onto","into","out","off","away","back","forth","forward","backward","ahead","behind","alongside","near","far","close","distant","remote","nearby","here","there","everywhere","nowhere","somewhere","anywhere","thus","therefore","however","moreover","furthermore","nevertheless","nonetheless","although","though","despite","because","since","unless","whether","either","neither","both","each","every","all","none","some","many","much","few","several","various","particular","certain","one","two","three","four","five","six","seven","eight","nine","ten","hundred","thousand","million","billion","zero","first","second","third","fourth","fifth","last","next","previous","following","preceding","succeeding","existing","remaining","leftover","extra","additional","another","other","same","different","similar","opposite","contrary","reverse","inverse","converse","transverse","obverse","reverse","front","back","side","top","bottom","middle","center","edge","corner","angle","point","line","curve","circle","square","round","flat","sharp","dull","smooth","rough","hard","soft","thick","thin","wide","narrow","tall","short","deep","shallow","heavy","light","dark","bright","dim","clear","cloudy","transparent","opaque","solid","liquid","gas","plasma","matter","energy","force","motion","speed","velocity","acceleration","mass","weight","volume","density","pressure","temperature","heat","cold","warm","cool","hot","freeze","frozen","melt","boil","evaporate","condense","solidify","crystallize","dissolve","solution","mixture","compound","element","atom","molecule","ion","electron","proton","neutron","nucleus","cell","tissue","organ","system","body","brain","heart","lung","blood","bone","muscle","skin","eye","ear","nose","mouth","hand","foot","leg","arm","head","face","neck","back","chest","stomach","waist","hip","knee","ankle","wrist","elbow","shoulder","finger","toe","hair","nail","tooth","teeth","tongue","lip","cheek","chin","forehead","temple","ear","eye","nose","mouth","chin","jaw","throat","voice","sound","noise","music","song","speech","word","letter","number","symbol","sign","mark","note","tag","label","title","name","term","phrase","sentence","paragraph","page","book","chapter","volume","issue","edition","version","copy","original","duplicate","replica","model","pattern","design","style","form","format","type","kind","sort","class","category","group","set","collection","series","sequence","order","arrangement","structure","system","network","web","grid","matrix","array","list","table","chart","graph","map","plan","diagram","figure","image","picture","photo","photograph","drawing","painting","art","artist","work","piece","creation","product","result","outcome","consequence","effect","impact","influence","role","function","purpose","use","usage","application","practice","method","technique","process","procedure","step","stage","phase","level","degree","extent","amount","quantity","number","count","total","sum","average","mean","median","mode","range","scope","scale","size","dimension","measure","measurement","unit","standard","criterion","basis","foundation","core","heart","center","middle","point","focus","target","goal","objective","aim","purpose","intent","intention","plan","scheme","strategy","tactic","approach","way","manner","method","mode","fashion","style","form","shape","outline","contour","profile","silhouette","shadow","reflection","mirror","glass","window","door","gate","entrance","exit","passage","corridor","hall","lobby","room","chamber","hall","court","arena","stadium","field","ground","court","ring","track","course","route","path","way","road","street","avenue","boulevard","highway","freeway","bridge","tunnel","station","stop","terminal","airport","port","harbor","dock","pier","wharf","quay","jetty","breakwater","seawall","dam","levee","dike","embankment","barrier","fence","wall","gate","door","window","roof","floor","ceiling","column","pillar","post","beam","arch","vault","dome","tower","spire","steeple","chimney","smokestack","furnace","oven","stove","heater","boiler","engine","motor","machine","device","tool","instrument","implement","utensil","appliance","equipment","gear","apparatus","mechanism","system","network","circuit","wire","cable","cord","line","pipe","tube","channel","duct","vent","flue","chimney","stack","tower","mast","pole","stick","rod","bar","beam","plank","board","panel","sheet","plate","block","brick","stone","rock","sand","gravel","dust","dirt","soil","earth","clay","mud","mud","clay","silt","sand","gravel","pebble","rock","stone","boulder","mountain","hill","valley","canyon","gorge","cliff","bluff","ridge","peak","summit","slope","side","face","wall","surface","layer","level","stratum","bed","floor","ground","bottom","base","foot","top","crest","crown","cap","cover","lid","top","bottom","side","edge","border","margin","rim","brim","lip","mouth","opening","hole","gap","space","room","area","zone","region","district","territory","province","state","country","nation","kingdom","empire","republic","democracy","monarchy","dictatorship","regime","government","rule","control","power","authority","command","order","direction","guidance","leadership","management","administration","organization","association","society","club","union","league","alliance","coalition","partnership","agreement","treaty","pact","deal","contract","arrangement","settlement","resolution","decision","choice","option","alternative","possibility","opportunity","chance","risk","danger","threat","hazard","peril","jeopardy","crisis","emergency","disaster","catastrophe","tragedy","calamity","misfortune","luck","fortune","fate","destiny","doom","ruin","destruction","creation","birth","life","death","growth","decline","fall","rise","increase","decrease","change","stability","balance","imbalance","equality","inequality","fairness","justice","injustice","right","wrong","good","bad","better","worse","best","worst","perfect","flawed","complete","incomplete","whole","partial","entire","full","empty","heavy","light","dark","bright","color","red","blue","green","yellow","orange","purple","pink","brown","black","white","gray","grey","silver","gold","metal","wood","plastic","rubber","leather","fabric","cloth","cotton","silk","wool","linen","paper","cardboard","glass","ceramic","concrete","asphalt","tar","oil","fuel","gas","petrol","diesel","coal","charcoal","carbon","hydrogen","oxygen","nitrogen","helium","neon","argon","krypton","xenon","radon","fluorine","chlorine","bromine","iodine","sulfur","phosphorus","silicon","boron","arsenic","antimony","bismuth","aluminum","copper","iron","steel","zinc","tin","lead","mercury","sodium","potassium","calcium","magnesium","aluminum","titanium","nickel","cobalt","chromium","manganese","tungsten","platinum","palladium","rhodium","iridium","osmium","ruthenium","silver","gold","brass","bronze","alloy","mixture","compound","solution","suspension","emulsion","colloid","gel","paste","cream","lotion","oil","grease","wax","resin","glue","adhesive","tape","sticker","label","tag","marker","pen","pencil","crayon","chalk","ink","paint","dye","color","shade","tint","hue","tone","gradient","blend","mix","combination","fusion","merger","union","junction","connection","link","bond","tie","knot","loop","ring","circle","sphere","globe","ball","orb","dot","point","spot","mark","stain","blemish","flaw","defect","fault","error","mistake","blunder","slip","lapse","oversight","omission","failure","success","triumph","victory","win","loss","defeat","draw","tie","match","game","sport","play","round","turn","move","action","reaction","interaction","communication","conversation","dialogue","discussion","debate","argument","dispute","conflict","fight","battle","war","peace","truce","ceasefire","armistice","surrender","retreat","advance","progress","development","improvement","enhancement","upgrade","update","revision","correction","fix","repair","mend","patch","restore","renew","refresh","recharge","refill","replenish","stock","supply","provide","deliver","send","ship","transport","carry","bring","take","fetch","get","receive","accept","reject","refuse","decline","deny","confirm","approve","authorize","permit","allow","grant","give","donate","contribute","offer","present","show","display","exhibit","demonstrate","prove","test","try","attempt","endeavor","effort","work","labor","toil","job","task","duty","chore","errand","mission","quest","journey","trip","tour","travel","voyage","expedition","excursion","outing","visit","call","meeting","appointment","interview","consultation","session","period","term","season","phase","stage","step","level","grade","rank","position","status","state","condition","situation","circumstance","case","instance","example","sample","specimen","model","pattern","template","blueprint","guide","manual","handbook","reference","directory","index","catalog","list","register","record","log","journal","diary","calendar","schedule","timetable","agenda","program","plan","scheme","plot","design","layout","blueprint","draft","sketch","outline","summary","brief","abstract","digest","review","critique","analysis","examination","inspection","investigation","inquiry","probe","search","hunt","quest","pursuit","chase","follow","trail","track","trace","mark","sign","signal","clue","hint","suggestion","tip","advice","counsel","guidance","direction","instruction","order","command","rule","law","regulation","policy","guideline","standard","norm","criterion","measure","yardstick","benchmark","test","trial","experiment","study","research","survey","poll","questionnaire","query","question","ask","inquire","request","demand","require","need","want","desire","wish","hope","expect","anticipate","await","wait","stay","remain","leave","depart","arrive","come","go","move","travel","journey","trip","tour","visit","explore","discover","find","locate","search","seek","look","watch","observe","see","view","notice","note","mark","spot","identify","recognize","know","understand","comprehend","grasp","learn","study","read","write","speak","talk","say","tell","inform","notify","report","announce","declare","state","express","convey","communicate","share","exchange","trade","swap","barter","buy","sell","purchase","acquire","obtain","gain","win","earn","make","create","produce","generate","build","construct","assemble","form","shape","make","do","act","perform","execute","implement","apply","use","utilize","employ","operate","run","manage","handle","deal","treat","cure","heal","mend","fix","repair","adjust","modify","change","alter","transform","convert","adapt","adjust","fit","suit","match","pair","couple","join","unite","combine","merge","blend","mix","stir","shake","beat","whip","churn","boil","cook","bake","fry","grill","roast","toast","burn","scorch","char","blacken","darken","lighten","whiten","bleach","color","dye","stain","paint","draw","sketch","trace","copy","duplicate","reproduce","replicate","clone","mimic","imitate","simulate","fake","forge","counterfeit","copy","original","real","true","false","fake","genuine","authentic","valid","legitimate","legal","illegal","lawful","unlawful","right","wrong","correct","incorrect","accurate","inaccurate","exact","precise","vague","specific","general","particular","special","unique","common","ordinary","regular","normal","usual","typical","standard","average","mean","median","extreme","moderate","mild","severe","strong","weak","powerful","feeble","sturdy","fragile","delicate","tough","hard","soft","smooth","rough","sharp","dull","blunt","pointed","flat","round","square","oval","circular","spherical","cylindrical","conical","pyramidal","triangular","rectangular","hexagonal","octagonal","polygonal","geometric","algebraic","mathematical","numerical","digital","analog","electronic","electric","magnetic","gravitational","nuclear","atomic","molecular","cellular","biological","chemical","physical","natural","artificial","synthetic","manmade","human","animal","plant","tree","flower","grass","weed","bush","shrub","vine","moss","fern","fungus","mushroom","mold","bacteria","virus","germ","microbe","organism","creature","beast","monster","pet","dog","cat","fish","bird","insect","bug","spider","snake","lizard","frog","turtle","rabbit","mouse","rat","squirrel","deer","bear","lion","tiger","elephant","monkey","ape","chimp","gorilla","orangutan","baboon","horse","cow","pig","sheep","goat","chicken","duck","goose","turkey","pigeon","dove","sparrow","robin","crow","raven","eagle","hawk","falcon","owl","seagull","pelican","stork","crane","heron","flamingo","penguin","ostrich","peacock","parrot","parakeet","canary","finch","swallow","wren","lark","nightingale","blackbird","starling","myna","magpie","jay","cardinal","bluebird","woodpecker","cuckoo","hummingbird","swift","martin","swallow","wagtail","pipit","lark","bunting","finch","sparrow","warbler","thrush","robin","chat","redstart","nightingale","blackbird","starling","myna","mockingbird","catbird","thrasher","wren","dunnock","accentor","shrike","vireo","tanager","cardinal","grosbeak","bunting","junco","longspur","snowbird","sparrow","towhee","robin","bluebird","thrush","solitaire","mockingbird","catbird","thrasher","wren","kinglet","gnatcatcher","vireo","warbler","tanager","cardinal","grosbeak","bunting","junco","longspur","snowbird","sparrow","towhee","robin","bluebird","thrush","solitaire","mockingbird","catbird","thrasher","wren","kinglet","gnatcatcher","vireo","warbler","tanager","cardinal","grosbeak","bunting","junco","longspur","snowbird","sparrow","towhee"
]);

const CURATED_VOCAB: Record<string, VocabEntry> = {
  analysis: { word: "analysis", partOfSpeech: "noun", meaning: "Detailed examination of the elements or structure of something.", simpleExplanation: "A careful study of something to understand it.", example: "The analysis revealed important trends in the data.", synonyms: ["study", "examination", "review", "investigation"], antonyms: ["guesswork"], pronunciation: "əˈnæləsɪs" },
  perspective: { word: "perspective", partOfSpeech: "noun", meaning: "A particular attitude toward or way of regarding something; a point of view.", simpleExplanation: "How you see or think about something.", example: "She offered a fresh perspective on the issue.", synonyms: ["viewpoint", "outlook", "angle", "standpoint"], antonyms: [], pronunciation: "pərˈspɛktɪv" },
  significant: { word: "significant", partOfSpeech: "adjective", meaning: "Sufficiently great or important to be worthy of attention; noteworthy.", simpleExplanation: "Big or important enough to matter.", example: "The change had a significant impact on the community.", synonyms: ["important", "notable", "meaningful", "considerable"], antonyms: ["minor", "trivial", "insignificant"], pronunciation: "sɪɡˈnɪfɪkənt" },
  context: { word: "context", partOfSpeech: "noun", meaning: "The circumstances that form the setting for an event, statement, or idea.", simpleExplanation: "The background that helps explain something.", example: "You need context to understand the decision.", synonyms: ["background", "setting", "circumstance", "framework"], antonyms: [], pronunciation: "ˈkɒntɛkst" },
  implication: { word: "implication", partOfSpeech: "noun", meaning: "A likely consequence of something; a meaning that is suggested but not directly stated.", simpleExplanation: "What something might lead to or mean.", example: "The policy has broad implications for the economy.", synonyms: ["consequence", "result", "outcome", "ramification"], antonyms: [], pronunciation: "ˌɪmplɪˈkeɪʃən" },
  negotiation: { word: "negotiation", partOfSpeech: "noun", meaning: "Discussion aimed at reaching an agreement between parties.", simpleExplanation: "Talking to make a deal or reach an agreement.", example: "The negotiation lasted three days before a deal was reached.", synonyms: ["discussion", "bargaining", "dialogue", "mediation"], antonyms: ["confrontation"], pronunciation: "nɪˌɡoʊʃiˈeɪʃən" },
  strategy: { word: "strategy", partOfSpeech: "noun", meaning: "A plan of action designed to achieve a long-term or overall goal.", simpleExplanation: "A smart plan to reach a goal.", example: "Their strategy focused on slow, steady growth.", synonyms: ["plan", "approach", "tactic", "scheme"], antonyms: [], pronunciation: "ˈstrætədʒi" },
  consensus: { word: "consensus", partOfSpeech: "noun", meaning: "General agreement among all members of a group.", simpleExplanation: "When most people agree on something.", example: "The committee reached a consensus after hours of debate.", synonyms: ["agreement", "accord", "unity", "harmony"], antonyms: ["disagreement", "conflict", "division"], pronunciation: "kənˈsɛnsəs" },
  unprecedented: { word: "unprecedented", partOfSpeech: "adjective", meaning: "Never done or known before; without previous example.", simpleExplanation: "Something that has never happened before.", example: "The decision was unprecedented in the court's history.", synonyms: ["unparalleled", "unmatched", "novel", "groundbreaking"], antonyms: ["common", "usual", "typical"], pronunciation: "ʌnˈprɛsɪdɛntɪd" },
  escalation: { word: "escalation", partOfSpeech: "noun", meaning: "A rapid increase or rise in the intensity or scope of something.", simpleExplanation: "When something gets bigger or more serious.", example: "The escalation of the conflict alarmed neighboring countries.", synonyms: ["increase", "rise", "intensification", "amplification"], antonyms: ["decrease", "reduction", "de-escalation"], pronunciation: "ˌɛskəˈleɪʃən" },
  sovereignty: { word: "sovereignty", partOfSpeech: "noun", meaning: "Supreme power or authority; a state's right to govern itself.", simpleExplanation: "A country's right to rule itself without outside control.", example: "The nation defended its sovereignty against foreign interference.", synonyms: ["independence", "self-rule", "autonomy", "authority"], antonyms: ["subjugation", "dependence"], pronunciation: "ˈsɒvrɪnti" },
  diplomacy: { word: "diplomacy", partOfSpeech: "noun", meaning: "The practice of managing international relations through negotiation and dialogue.", simpleExplanation: "Solving problems between countries through talking, not fighting.", example: "Diplomacy resolved the crisis without military action.", synonyms: ["negotiation", "statesmanship", "tact", "mediation"], antonyms: ["hostility", "aggression"], pronunciation: "dɪˈploʊməsi" },
  sanctions: { word: "sanctions", partOfSpeech: "noun", meaning: "Penalties imposed by a country or international body to pressure another to change behavior.", simpleExplanation: "Punishments used to make a country change its actions.", example: "Economic sanctions were imposed to pressure the regime.", synonyms: ["penalties", "embargoes", "restrictions"], antonyms: ["rewards", "incentives"], pronunciation: "ˈsæŋkʃənz" },
  coalition: { word: "coalition", partOfSpeech: "noun", meaning: "An alliance of distinct parties, persons, or states for joint action.", simpleExplanation: "Different groups working together for a shared goal.", example: "A coalition of nations joined forces to address the crisis.", synonyms: ["alliance", "partnership", "union", "bloc"], antonyms: ["division", "split"], pronunciation: "ˌkoʊəˈlɪʃən" },
  resolution: { word: "resolution", partOfSpeech: "noun", meaning: "A firm decision to do or not do something; a formal expression of opinion by a group.", simpleExplanation: "A formal decision or plan to act.", example: "The UN passed a resolution condemning the violence.", synonyms: ["decision", "decree", "declaration", "settlement"], antonyms: ["indecision"], pronunciation: "ˌrɛzəˈluʃən" },
  infrastructure: { word: "infrastructure", partOfSpeech: "noun", meaning: "The basic physical and organizational structures needed for a society to function.", simpleExplanation: "Things like roads, bridges, and power grids that a place needs to work.", example: "The country invested heavily in infrastructure.", synonyms: ["framework", "foundation", "facilities"], antonyms: [], pronunciation: "ˈɪnfrəˌstrʌktʃər" },
  recession: { word: "recession", partOfSpeech: "noun", meaning: "A period of temporary economic decline, identified by falling trade and industrial output.", simpleExplanation: "When the economy shrinks for a period of time.", example: "The country entered a recession after the financial crisis.", synonyms: ["downturn", "decline", "slump", "contraction"], antonyms: ["boom", "growth", "expansion"], pronunciation: "rɪˈsɛʃən" },
  legislation: { word: "legislation", partOfSpeech: "noun", meaning: "Laws or a set of laws proposed or enacted by a government.", simpleExplanation: "Laws made by a government.", example: "New legislation was passed to protect the environment.", synonyms: ["laws", "statutes", "regulations", "acts"], antonyms: [], pronunciation: "ˌlɛdʒɪsˈleɪʃən" },
  humanitarian: { word: "humanitarian", partOfSpeech: "adjective", meaning: "Concerned with or seeking to promote human welfare.", simpleExplanation: "Focused on helping people who are suffering.", example: "Humanitarian aid was rushed to the disaster zone.", synonyms: ["compassionate", "benevolent", "charitable"], antonyms: ["cruel", "oppressive"], pronunciation: "hjuːˌmænɪˈtɛəriən" },
  volatile: { word: "volatile", partOfSpeech: "adjective", meaning: "Liable to change rapidly and unpredictably, especially for the worse.", simpleExplanation: "Something that can change quickly and without warning.", example: "The region's political situation remains volatile.", synonyms: ["unstable", "unpredictable", "changeable", "turbulent"], antonyms: ["stable", "steady", "calm"], pronunciation: "ˈvɒlətaɪl" },
  controversial: { word: "controversial", partOfSpeech: "adjective", meaning: "Giving rise to public disagreement or heated argument.", simpleExplanation: "Something people strongly disagree about.", example: "The controversial policy sparked nationwide protests.", synonyms: ["disputed", "debatable", "contentious"], antonyms: ["uncontroversial", "agreed"], pronunciation: "ˌkɒntrəˈvɜrʃəl" },
  sanctions: { word: "sanctions", partOfSpeech: "noun", meaning: "Official penalties or restrictions imposed to pressure a country or group.", simpleExplanation: "Punishments used to make a country change its actions.", example: "International sanctions targeted the country's oil exports.", synonyms: ["penalties", "embargoes", "restrictions"], antonyms: ["rewards", "incentives"], pronunciation: "ˈsæŋkʃənz" },
  mandate: { word: "mandate", partOfSpeech: "noun", meaning: "The authority to carry out a policy, granted by the electorate to a winner of an election.", simpleExplanation: "Permission given by voters to a leader to carry out their plans.", example: "The president claimed a mandate to reform healthcare.", synonyms: ["authority", "commission", "directive", "charge"], antonyms: [], pronunciation: "ˈmændeɪt" },
  referendum: { word: "referendum", partOfSpeech: "noun", meaning: "A direct vote by the electorate on a single political question.", simpleExplanation: "When all voters decide on a specific question directly.", example: "The country held a referendum on leaving the union.", synonyms: ["plebiscite", "ballot", "vote"], antonyms: [], pronunciation: "ˌrɛfəˈrɛndəm" },
  sanction: { word: "sanction", partOfSpeech: "noun", meaning: "A threatened penalty for disobeying a law or rule.", simpleExplanation: "A punishment for breaking a rule.", example: "The sanction was lifted after the country complied.", synonyms: ["penalty", "punishment", "fine"], antonyms: ["approval"], pronunciation: "ˈsæŋkʃən" },
  embargo: { word: "embargo", partOfSpeech: "noun", meaning: "An official ban on trade or other commercial activity with a particular country.", simpleExplanation: "A government order that stops trade with a country.", example: "The trade embargo severely damaged the country's economy.", synonyms: ["ban", "prohibition", "blockade", "restriction"], antonyms: ["permission", "allowance"], pronunciation: "ɛmˈbɑrɡoʊ" },
  summit: { word: "summit", partOfSpeech: "noun", meaning: "A meeting between heads of government; the highest point or peak.", simpleExplanation: "A high-level meeting between top leaders.", example: "World leaders gathered at the summit to discuss climate change.", synonyms: ["conference", "meeting", "peak", "conference"], antonyms: [], pronunciation: "ˈsʌmɪt" },
  treaty: { word: "treaty", partOfSpeech: "noun", meaning: "A formally concluded and ratified agreement between states.", simpleExplanation: "A formal written agreement between countries.", example: "The peace treaty ended decades of conflict.", synonyms: ["agreement", "pact", "accord", "convention"], antonyms: [], pronunciation: "ˈtriːti" },
  regime: { word: "regime", partOfSpeech: "noun", meaning: "A government, especially an authoritarian one; a system or planned way of doing things.", simpleExplanation: "A government, often one that holds power tightly.", example: "The military regime seized power in a coup.", synonyms: ["government", "administration", "system", "rule"], antonyms: [], pronunciation: "rɪˈʒiːm" },
  crisis: { word: "crisis", partOfSpeech: "noun", meaning: "A time of intense difficulty, trouble, or danger.", simpleExplanation: "A very serious and difficult situation.", example: "The country faced an economic crisis.", synonyms: ["emergency", "catastrophe", "disaster", "turning point"], antonyms: ["calm", "stability"], pronunciation: "ˈkraɪsɪs" },
  reform: { word: "reform", partOfSpeech: "noun", meaning: "The action of improving or changing a system or organization.", simpleExplanation: "Making something better by changing it.", example: "Education reform was the government's top priority.", synonyms: ["improvement", "change", "revision", "overhaul"], antonyms: ["stagnation", "status quo"], pronunciation: "rɪˈfɔrm" },
  inflation: { word: "inflation", partOfSpeech: "noun", meaning: "A general increase in prices and fall in the purchasing value of money.", simpleExplanation: "When prices go up and money buys less.", example: "Inflation reached its highest level in a decade.", synonyms: ["price rise", "devaluation"], antonyms: ["deflation"], pronunciation: "ɪnˈfleɪʃən" },
  deployment: { word: "deployment", partOfSpeech: "noun", meaning: "The movement of troops or equipment to a place where they can be used when needed.", simpleExplanation: "Sending soldiers or equipment to where they are needed.", example: "The deployment of troops to the border raised tensions.", synonyms: ["stationing", "positioning", "mobilization"], antonyms: ["withdrawal"], pronunciation: "dɪˈplɔɪmənt" },
  ceasefire: { word: "ceasefire", partOfSpeech: "noun", meaning: "A temporary suspension of fighting; a truce.", simpleExplanation: "An agreement to stop fighting for a while.", example: "Both sides agreed to a ceasefire to allow aid deliveries.", synonyms: ["truce", "armistice", "peace", "halt"], antonyms: ["offensive", "attack"], pronunciation: "ˈsiːsˌfaɪər" },
  allegation: { word: "allegation", partOfSpeech: "noun", meaning: "A claim or assertion that someone has done something wrong, typically without proof.", simpleExplanation: "A claim that someone did something wrong, not yet proven.", example: "The allegation of corruption led to an investigation.", synonyms: ["claim", "accusation", "charge", "assertion"], antonyms: ["denial"], pronunciation: "ˌælɪˈɡeɪʃən" },
  protest: { word: "protest", partOfSpeech: "noun", meaning: "A statement or action expressing disapproval of or objection to something.", simpleExplanation: "When people show they disagree with something, often publicly.", example: "Thousands joined the protest against the new law.", synonyms: ["demonstration", "march", "objection", "dissent"], antonyms: ["support", "approval"], pronunciation: "ˈproʊtɛst" },
  surveillance: { word: "surveillance", partOfSpeech: "noun", meaning: "Close observation, especially of a suspected person or group.", simpleExplanation: "Watching someone or something carefully.", example: "The government increased surveillance after the threat.", synonyms: ["monitoring", "observation", "watching", "supervision"], antonyms: [], pronunciation: "sərˈveɪləns" },
  cybersecurity: { word: "cybersecurity", partOfSpeech: "noun", meaning: "The protection of computer systems and networks from attack or damage.", simpleExplanation: "Keeping computers and online information safe from hackers.", example: "The company invested in cybersecurity after the breach.", synonyms: ["digital security", "information security"], antonyms: [], pronunciation: "ˌsaɪbərsɪˈkjʊərɪti" },
  outbreak: { word: "outbreak", partOfSpeech: "noun", meaning: "A sudden occurrence of something unwelcome, such as war or disease.", simpleExplanation: "When something bad starts suddenly.", example: "The outbreak of violence displaced thousands.", synonyms: ["eruption", "onset", "flare-up", "burst"], antonyms: ["end", "cessation"], pronunciation: "ˈaʊtbreɪk" },
  refugee: { word: "refugee", partOfSpeech: "noun", meaning: "A person who has been forced to leave their country to escape war, persecution, or disaster.", simpleExplanation: "Someone who flees their home to find safety.", example: "Millions became refugees after the conflict began.", synonyms: ["asylum seeker", "exile", "displaced person"], antonyms: [], pronunciation: "ˌrɛfjuˈdʒiː" },
  innovation: { word: "innovation", partOfSpeech: "noun", meaning: "A new method, idea, or product; the act of introducing something new.", simpleExplanation: "A new idea or invention that improves how things work.", example: "Technological innovation drives economic growth.", synonyms: ["invention", "novelty", "breakthrough", "advancement"], antonyms: ["tradition", "stagnation"], pronunciation: "ˌɪnəˈveɪʃən" },
  sustainability: { word: "sustainability", partOfSpeech: "noun", meaning: "The ability to maintain something at a certain rate or level without depleting resources.", simpleExplanation: "Using resources so they last for the future.", example: "The company committed to sustainability in its supply chain.", synonyms: ["viability", "endurance", "conservation"], antonyms: ["wastefulness"], pronunciation: "səˌsteɪnəˈbɪlɪti" },
  renewable: { word: "renewable", partOfSpeech: "adjective", meaning: "Able to be replenished naturally; not depleted when used.", simpleExplanation: "Energy or resources that don't run out, like wind or sun.", example: "Renewable energy now powers half the country.", synonyms: ["sustainable", "replenishable", "regenerative"], antonyms: ["finite", "nonrenewable"], pronunciation: "rɪˈnuːəbəl" },
  emission: { word: "emission", partOfSpeech: "noun", meaning: "The production and discharge of something, especially gas or radiation.", simpleExplanation: "Gases or pollution released into the air.", example: "Carbon emissions must be reduced to slow climate change.", synonyms: ["discharge", "release", "output"], antonyms: ["absorption"], pronunciation: "ɪˈmɪʃən" },
  biodiversity: { word: "biodiversity", partOfSpeech: "noun", meaning: "The variety of plant and animal life in a particular habitat.", simpleExplanation: "The variety of living things in a place.", example: "Protecting biodiversity is essential for healthy ecosystems.", synonyms: ["ecological variety", "biological diversity"], antonyms: ["monoculture"], pronunciation: "ˌbaɪoʊdaɪˈvɜrsɪti" },
  sanctions: { word: "sanctions", partOfSpeech: "noun", meaning: "Official penalties or restrictions imposed to pressure a country or group.", simpleExplanation: "Punishments used to make a country change its actions.", example: "The sanctions targeted the country's financial sector.", synonyms: ["penalties", "restrictions", "embargoes"], antonyms: ["rewards"], pronunciation: "ˈsæŋkʃənz" },
  aftermath: { word: "aftermath", partOfSpeech: "noun", meaning: "The consequences or results of an event, especially an unpleasant one.", simpleExplanation: "What happens after a big event, usually bad.", example: "In the aftermath of the storm, aid poured in.", synonyms: ["consequences", "results", "effects", "fallout"], antonyms: [], pronunciation: "ˈæftərmæθ" },
  casualty: { word: "casualty", partOfSpeech: "noun", meaning: "A person killed or injured in war or accident.", simpleExplanation: "Someone hurt or killed in an event.", example: "There were no casualties in the evacuation.", synonyms: ["victim", "fatality", "injured"], antonyms: ["survivor"], pronunciation: "ˈkæʒuəlti" },
  evacuation: { word: "evacuation", partOfSpeech: "noun", meaning: "The action of moving people from a dangerous place to a safe one.", simpleExplanation: "Moving people away from danger to safety.", example: "The evacuation went smoothly despite the chaos.", synonyms: ["removal", "retreat", "exodus", "withdrawal"], antonyms: ["arrival"], pronunciation: "ɪˌvækjuˈeɪʃən" },
  resilience: { word: "resilience", partOfSpeech: "noun", meaning: "The capacity to recover quickly from difficulties; toughness.", simpleExplanation: "The ability to bounce back after something bad happens.", example: "The community showed remarkable resilience after the disaster.", synonyms: ["toughness", "flexibility", "adaptability", "endurance"], antonyms: ["fragility", "vulnerability"], pronunciation: "rɪˈzɪliəns" },
  prosperity: { word: "prosperity", partOfSpeech: "noun", meaning: "The state of being successful, usually by making a lot of money; flourishing.", simpleExplanation: "When people and places are doing well and are successful.", example: "The region enjoyed decades of prosperity.", synonyms: ["wealth", "success", "affluence", "well-being"], antonyms: ["poverty", "hardship"], pronunciation: "prɒsˈpɛrɪti" },
  destabilize: { word: "destabilize", partOfSpeech: "verb", meaning: "To upset the stability of a region, government, or system.", simpleExplanation: "To make something unstable or shaky.", example: "The attacks were designed to destabilize the government.", synonyms: ["disrupt", "unsettle", "undermine", "weaken"], antonyms: ["stabilize", "strengthen"], pronunciation: "diːˈsteɪbəlaɪz" },
  rhetoric: { word: "rhetoric", partOfSpeech: "noun", meaning: "The art of effective or persuasive speaking or writing; language designed to persuade.", simpleExplanation: "The way words are used to persuade or impress people.", example: "The leader's rhetoric inflamed tensions.", synonyms: ["oratory", "eloquence", "persuasion", "discourse"], antonyms: [], pronunciation: "ˈrɛtərɪk" },
  bilateral: { word: "bilateral", partOfSpeech: "adjective", meaning: "Involving two parties, usually two countries.", simpleExplanation: "Between two countries or groups.", example: "The two nations signed a bilateral trade agreement.", synonyms: ["two-sided", "mutual", "reciprocal"], antonyms: ["unilateral", "multilateral"], pronunciation: "baɪˈlætərəl" },
  multilateral: { word: "multilateral", partOfSpeech: "adjective", meaning: "Agreed upon or participated in by three or more parties, especially countries.", simpleExplanation: "Involving several countries working together.", example: "The multilateral agreement included 50 nations.", synonyms: ["international", "joint", "collective"], antonyms: ["unilateral", "bilateral"], pronunciation: "ˌmʌltiˈlætərəl" },
  autonomous: { word: "autonomous", partOfSpeech: "adjective", meaning: "Having the freedom to govern itself or control its own affairs.", simpleExplanation: "Able to make its own decisions and rules.", example: "The region declared itself an autonomous zone.", synonyms: ["independent", "self-governing", "sovereign", "self-ruling"], antonyms: ["dependent", "controlled"], pronunciation: "ɔːˈtɒnəməs" },
  parliament: { word: "parliament", partOfSpeech: "noun", meaning: "A legislative body of government; a group of people elected to make laws.", simpleExplanation: "A group of people who make laws for a country.", example: "The parliament passed the new budget after weeks of debate.", synonyms: ["legislature", "congress", "assembly", "senate"], antonyms: [], pronunciation: "ˈpɑrləmənt" },
  cabinet: { word: "cabinet", partOfSpeech: "noun", meaning: "A committee of senior ministers who advise the head of government.", simpleExplanation: "A group of top advisors who help a leader run the government.", example: "The cabinet met to discuss the crisis.", synonyms: ["ministers", "advisors", "council"], antonyms: [], pronunciation: "ˈkæbɪnɪt" },
  impeachment: { word: "impeachment", partOfSpeech: "noun", meaning: "A charge of misconduct made against a public official.", simpleExplanation: "When a leader is formally accused of doing wrong and may be removed.", example: "The impeachment proceedings lasted months.", synonyms: ["accusation", "charge", "indictment"], antonyms: ["exoneration"], pronunciation: "ɪmˈpiːtʃmənt" },
  inauguration: { word: "inauguration", partOfSpeech: "noun", meaning: "The formal beginning of a leader's term of office.", simpleExplanation: "The ceremony when a new leader officially starts their job.", example: "The inauguration drew crowds from across the country.", synonyms: ["installation", "swearing-in", "induction"], antonyms: [], pronunciation: "ɪˌnɔɡjuˈreɪʃən" },
  opposition: { word: "opposition", partOfSpeech: "noun", meaning: "A group of people who oppose the government or a particular policy.", simpleExplanation: "People who are against the people in power.", example: "The opposition called for new elections.", synonyms: ["dissenters", "critics", "rivals", "challengers"], antonyms: ["supporters", "government"], pronunciation: "ˌɒpəˈzɪʃən" },
  corruption: { word: "corruption", partOfSpeech: "noun", meaning: "Dishonest or fraudulent conduct by those in power, typically involving bribery.", simpleExplanation: "When people in power do dishonest things for personal gain.", example: "Corruption scandals plagued the administration.", synonyms: ["bribery", "fraud", "dishonesty", "graft"], antonyms: ["honesty", "integrity"], pronunciation: "kəˈrʌpʃən" },
  transparency: { word: "transparency", partOfSpeech: "noun", meaning: "Openness and accountability in the way an organization operates.", simpleExplanation: "Being open and honest about how things work.", example: "The government promised greater transparency in its spending.", synonyms: ["openness", "clarity", "accountability", "candor"], antonyms: ["secrecy", "concealment"], pronunciation: "trænsˈpærənsi" },
  accountability: { word: "accountability", partOfSpeech: "noun", meaning: "The fact of being responsible for one's actions and decisions.", simpleExplanation: "When people must explain and take responsibility for what they do.", example: "The public demanded accountability from their leaders.", synonyms: ["responsibility", "answerability", "liability"], antonyms: ["irresponsibility"], pronunciation: "əˌkaʊntəˈbɪlɪti" },
};

function generateLocalVocabFallback(text: string): VocabEntry[] {
  if (!text || text.trim().length < 10) {
    const fallback = Object.values(CURATED_VOCAB);
    return fallback.slice(0, 6);
  }
  const words = text
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 6 && w.length <= 18 && !STOPWORDS.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const picks: VocabEntry[] = [];
  const used = new Set<string>();
  // First pass: match article words to the curated dictionary
  for (const [w] of sorted) {
    const curated = CURATED_VOCAB[w];
    if (curated && !used.has(w)) { picks.push(curated); used.add(w); }
    if (picks.length >= 6) break;
  }
  // Second pass: fill remaining slots with other curated words
  const allCurated = Object.values(CURATED_VOCAB);
  for (const v of allCurated) {
    if (picks.length >= 6) break;
    if (!used.has(v.word!)) { picks.push(v); used.add(v.word!); }
  }
  return picks.slice(0, 6);
}

/** Enhance incomplete vocab entries from the database with curated data when available. */
function enhanceVocabEntries(entries: VocabEntry[]): VocabEntry[] {
  return entries.map((e) => {
    if (!e.word) return e;
    const curated = CURATED_VOCAB[e.word.toLowerCase()];
    if (!curated) return e;
    return {
      ...e,
      meaning: e.meaning || curated.meaning,
      simpleExplanation: e.simpleExplanation || curated.simpleExplanation,
      example: e.example || curated.example,
      synonyms: e.synonyms?.length ? e.synonyms : curated.synonyms,
      antonyms: e.antonyms?.length ? e.antonyms : curated.antonyms,
      pronunciation: e.pronunciation || curated.pronunciation,
      partOfSpeech: e.partOfSpeech || curated.partOfSpeech,
    };
  });
}

const PROMPTS = [
  { id: "learned", label: "What did you learn?" },
  { id: "surprised", label: "What surprised you?" },
  { id: "question", label: "What question remains?" },
  { id: "perspective", label: "Your perspective" },
] as const;

type SortMode = "newest" | "top" | "oldest";
const COMMENTS_PAGE_SIZE = 20;

function KnowledgeCheckReflection({ articleId, story, title }: { articleId: string; story?: any; title?: string }) {
  const qc = useQueryClient();
  const sendReflection = useServerFn(postReflection);

  const reflectionMutation = useMutation({
    mutationFn: (text: string) =>
      sendReflection({ data: { articleId, body: text, promptType: "perspective", parentId: null } }),
    onMutate: (text) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: CommentRow = {
        id: tempId,
        article_id: articleId,
        user_id: null,
        parent_id: null,
        prompt_type: "perspective",
        body: text,
        like_count: 0,
        reply_count: 0,
        is_edited: false,
        status: "active",
        created_at: new Date().toISOString(),
        author: null,
      };
      (["newest", "top", "oldest"] as SortMode[]).forEach((s) => {
        qc.setQueryData<CommentRow[]>(["comments", articleId, s], (old = []) => [optimistic, ...old]);
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.success("Your reflection was posted to the discussion");
      requestAnimationFrame(() => {
        document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.error("Could not post your reflection. Please try again.");
    },
  });

  return (
    <KnowledgeCheck
      articleId={articleId}
      story={story}
      title={title}
      onReflection={(reflectionText: string) => {
        reflectionMutation.mutate(reflectionText);
      }}
    />
  );
}

function CommentAvatar({ author }: { author: CommentRow["author"] }) {
  const name = author?.display_name || author?.username || "Reader";
  const initials = name.slice(0, 2).toUpperCase();
  if (author?.avatar_url) {
    return <img src={author.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 font-serif text-sm font-medium">
      {initials}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Discussion({ articleId }: { articleId: string }) {
  const qc = useQueryClient();
  const fetchComments = useServerFn(listComments);
  const sendReflection = useServerFn(postReflection);
  const likeFn = useServerFn(bumpLike);
  const deleteFn = useServerFn(deleteCommentAnon);
  const fetchLiked = useServerFn(getLikedComments);
  const [prompt, setPrompt] = useState<typeof PROMPTS[number]["id"]>("perspective");
  const [body, setBody] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [visibleCount, setVisibleCount] = useState(COMMENTS_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", articleId, sort],
    queryFn: () => fetchComments({ data: { articleId, sort } }),
    staleTime: 0,
  });

  // Restore liked state from server (for authenticated users)
  useEffect(() => {
    fetchLiked({ data: { articleId } })
      .then((ids: string[]) => {
        if (Array.isArray(ids) && ids.length) {
          setLikedComments(new Set(ids));
        }
      })
      .catch(() => {});
  }, [articleId, fetchLiked]);

  // Build threaded structure
  const topLevel = comments.filter((c: CommentRow) => !c.parent_id);
  const repliesOf = (parentId: string) => comments.filter((c: CommentRow) => c.parent_id === parentId);

  const sortedTop = [...topLevel].sort((a, b) => {
    if (sort === "top") return (b.like_count ?? 0) - (a.like_count ?? 0);
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Infinite scroll: show visibleCount top-level comments, load more when sentinel visible
  const visibleTop = sortedTop.slice(0, visibleCount);
  const hasMore = sortedTop.length > visibleCount;

  useEffect(() => {
    setVisibleCount(COMMENTS_PAGE_SIZE);
  }, [articleId, sort]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + COMMENTS_PAGE_SIZE);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const mutation = useMutation({
    mutationFn: (input: { body: string; promptType: typeof PROMPTS[number]["id"]; parentId?: string | null }) =>
      sendReflection({ data: { articleId, body: input.body, promptType: input.promptType, parentId: input.parentId ?? null } }),
    onMutate: (input) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: CommentRow = {
        id: tempId,
        article_id: articleId,
        user_id: null,
        parent_id: input.parentId ?? null,
        prompt_type: input.promptType,
        body: input.body,
        like_count: 0,
        reply_count: 0,
        is_edited: false,
        status: "active",
        created_at: new Date().toISOString(),
        author: null,
      };
      qc.setQueryData<CommentRow[]>(["comments", articleId, sort], (old = []) => [...old, optimistic]);
      setBody("");
      setReplyBody("");
      setReplyingTo(null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.success("Posted to the discussion");
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.success("Posted to the discussion");
    },
  });

  const likeMutation = useMutation({
    mutationFn: (commentId: string) => likeFn({ data: { commentId } }),
    onMutate: (commentId) => {
      const wasLiked = likedComments.has(commentId);
      setLikedComments((prev) => {
        const next = new Set(prev);
        if (next.has(commentId)) next.delete(commentId);
        else next.add(commentId);
        return next;
      });
      // Optimistically update like count
      qc.setQueryData<CommentRow[]>(["comments", articleId, sort], (old = []) =>
        old.map((c) =>
          c.id === commentId
            ? { ...c, like_count: Math.max(0, (c.like_count ?? 0) + (wasLiked ? -1 : 1)) }
            : c,
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
    },
    onError: () => {
      // Revert on error
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteFn({ data: { commentId } }),
    onMutate: (commentId) => {
      qc.setQueryData<CommentRow[]>(["comments", articleId, sort], (old = []) =>
        old.filter((c) => c.id !== commentId),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.success("Comment deleted");
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.error("Could not delete comment");
    },
  });

  function renderComment(c: CommentRow, isReply: boolean) {
    const isLiked = likedComments.has(c.id);
    const count = c.like_count ?? 0;
    const replyCount = c.reply_count ?? 0;
    const childReplies = repliesOf(c.id);
    return (
      <div className={isReply ? "ml-6 border-l border-foreground/10 pl-4" : "border-t rule pt-6"}>
        <div className="flex items-start gap-3">
          <CommentAvatar author={c.author} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-serif font-medium">
                {c.author?.display_name || c.author?.username || "Reader"}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {c.prompt_type && !isReply && (
                  <span className="kicker text-[0.6rem]">
                    {PROMPTS.find((p) => p.id === c.prompt_type)?.label ?? c.prompt_type}
                  </span>
                )}
                {formatTimeAgo(c.created_at)}
              </div>
            </div>

            <p className="font-serif text-lg leading-snug whitespace-pre-wrap">{c.body}</p>

            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => likeMutation.mutate(c.id)}
                className={`flex items-center gap-1 text-sm transition ${isLiked ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {isLiked ? <ArrowBigUp className="h-4 w-4 fill-current" /> : <ArrowBigUp className="h-4 w-4" />}
                <span>{count}</span>
              </button>
              {!isReply && (
                <button
                  onClick={() => {
                    setReplyingTo(replyingTo === c.id ? null : c.id);
                    setReplyBody("");
                  }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Reply{replyCount > 0 && ` (${replyCount})`}</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Delete this comment? This cannot be undone.")) {
                    deleteMutation.mutate(c.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-600 transition disabled:opacity-40"
                aria-label="Delete comment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {replyingTo === c.id && (
              <div className="mt-4 ml-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder={`Reply to ${c.author?.display_name || c.author?.username || "Reader"}…`}
                  className="w-full bg-transparent border rule p-4 font-serif text-base focus:outline-none focus:ring-1 focus:ring-foreground/40"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => replyBody.trim() && mutation.mutate({ body: replyBody.trim(), promptType: "reply" as typeof PROMPTS[number]["id"], parentId: c.id })}
                    disabled={!replyBody.trim() || mutation.isPending}
                    className="border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
                  >
                    {mutation.isPending ? "Posting…" : "Post reply"}
                  </button>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {childReplies.length > 0 && (
              <div className="mt-4 space-y-4">
                {childReplies.map((r: CommentRow) => (
                  <div key={r.id}>{renderComment(r, true)}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id="discussion" className="container-read py-16 border-t rule scroll-mt-4">
      <div className="kicker mb-6">The Discussion</div>
      <h2 className="display-2 mb-8">
        A guided conversation
        {comments.length > 0 && (
          <span className="ml-3 text-base font-sans text-muted-foreground">({comments.length} {comments.length === 1 ? "contribution" : "contributions"})</span>
        )}
      </h2>

      <div className="border rule p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPrompt(p.id)}
              className={`px-3 py-1.5 text-xs uppercase tracking-widest border rule transition ${prompt === p.id ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder={PROMPTS.find((p) => p.id === prompt)?.label}
          className="w-full bg-transparent border rule p-4 font-serif text-lg focus:outline-none focus:ring-1 focus:ring-foreground/40"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted-foreground">{body.length}/4000</div>
          <button
            onClick={() => body.trim() && mutation.mutate({ body: body.trim(), promptType: prompt })}
            disabled={!body.trim() || mutation.isPending}
            className="border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
          >
            {mutation.isPending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </div>

      {comments.length > 0 && (
        <div className="mt-8 flex items-center gap-2">
          <span className="kicker">Sort by</span>
          {(["newest", "top", "oldest"] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 text-xs uppercase tracking-widest border rule transition capitalize ${sort === s ? "bg-foreground text-background" : "hover:bg-foreground/[0.05]"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10 space-y-8">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No contributions yet. Be the first.</p>
        )}
        {visibleTop.map((c: CommentRow) => renderComment(c, false))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          <span className="text-sm text-muted-foreground">Loading more…</span>
        </div>
      )}
    </section>
  );
}
