import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getArticleBySlug, getRelated, listComments } from "@/lib/articles.functions";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { postComment } from "@/lib/interactions.functions";
import { toggleCommentLike } from "@/lib/quiz.functions";
import { ArticleActions } from "@/components/article-actions";
import { ArticleCard } from "@/components/article-card";
import { categoryLabel } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Quote, Lightbulb, Clock, TrendingUp, Users, Building2, Globe2, Hash, Sparkles, Info, Bookmark, ChevronRight, ArrowBigUp } from "lucide-react";
import type { CommentRow, ArticleStory, KeyNumber, PersonInvolved, OrganizationInvolved, CountryInvolved } from "@/lib/types";
import { fallbackCoverUrl } from "@/lib/article-images";
import { WordSearch } from "@/components/word-search";
import { KnowledgeCheck } from "@/components/KnowledgeCheck";
import { EnhancedVocabCard } from "@/components/EnhancedVocabCard";
import { canonicalUrl, articleUrl, newsArticleJsonLd, breadcrumbJsonLd, SITE_NAME, SITE_LOGO, SITE_URL } from "@/lib/seo";

const articleQ = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: () => getArticleBySlug({ data: { slug } }),
  });

function directSupabaseClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "https://0ec90b57d6e95fcbda19832f.supabase.co",
    process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw",
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    try {
      const a = await context.queryClient.ensureQueryData(articleQ(params.slug));
      if (!a) throw notFound();
      return { article: a };
    } catch (e) {
      if (e && typeof e === 'object' && 'status' in e && (e as any).status === 404) throw e;
      try {
        const supabase = directSupabaseClient();
        const { data: row, error } = await supabase
          .from("articles")
          .select("*")
          .eq("slug", params.slug)
          .eq("is_published", true)
          .maybeSingle();
        if (error) throw error;
        if (!row) throw notFound();
        return { article: row as any };
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
  const { data: article } = useSuspenseQuery(articleQ(slug));
  if (!article) return null;
  const story = article.story ?? {};
  const cover = article.cover_image_url || fallbackCoverUrl(article);

  const { data: related = [] } = useQuery({
    queryKey: ["related", article.category, article.slug],
    queryFn: () => getRelated({ data: { category: article.category, excludeSlug: article.slug } }),
  });

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
      <header className="container-read pt-10 md:pt-16 text-center">
        <div className="kicker">{categoryLabel(article.category)}</div>
        <h1 className="display-1 mt-5">{article.title}</h1>
        {article.dek && <p className="dek mt-6 text-balance">{article.dek}</p>}
        {addedDate && (
          <div className="mt-4 text-sm text-muted-foreground">
            {addedDate}
          </div>
        )}
        <div className="mt-6 flex justify-center">
          <ArticleActions articleId={article.id} title={article.title} />
        </div>
      </header>

      <figure className="container-edit mt-10 group">
        <img
          src={cover}
          alt={article.title}
          className="w-full max-h-[70vh] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
          loading="eager"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== fallbackCoverUrl(article)) img.src = fallbackCoverUrl(article);
          }}
        />
      </figure>

      {/* Story Mode */}
      <section className="container-read py-12 md:py-16" style={{ fontSize: "var(--article-font-size, 17px)", lineHeight: "var(--article-line-height, 1.6)" }}>
        <div className="article-content grid gap-10">
          <StoryBlock label="Quick Summary" body={story.summary} />
          <StoryBlock label="Main Story" body={story.main_story} />

          {story.background && <StoryBlock label="Background" body={story.background} />}

          {story.key_developments && story.key_developments.length > 0 && (
            <KeyDevelopmentsBlock items={story.key_developments} />
          )}

          {story.quick_insights && story.quick_insights.length > 0 && (
            <ListBlock label="Quick Insights" items={story.quick_insights} />
          )}

          {story.why_it_matters && (
            <InfoBox label="Why This Matters" body={story.why_it_matters} icon="lightbulb" />
          )}

          {story.expert_analysis && <StoryBlock label="Expert Insights" body={story.expert_analysis} />}

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

          {tags.length > 0 && <RelatedTopics tags={tags} />}
        </div>

        {/* Interactive features (outside article-content for Journey compatibility) */}
        <div className="grid gap-10 mt-10">
          <div className="border-y rule py-10">
            <div className="kicker mb-6">Vocabulary Builder</div>
            {story.vocabulary && story.vocabulary.length > 0 ? (
              <div className="grid gap-6">
                {story.vocabulary.map((v, i) => (
                  <EnhancedVocabCard key={`${v.word}-${i}`} entry={v} articleId={article.id} index={i} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No vocabulary highlights for this article yet.
              </p>
            )}

            <WordSearch />
          </div>

          <KnowledgeCheckReflection articleId={article.id} story={story} title={article.title} />
        </div>

        <div className="mt-12 flex justify-center">
          <ArticleActions articleId={article.id} title={article.title} />
        </div>

      </section>

      {/* Comments */}
      <Discussion articleId={article.id} />

      {/* Related */}
      {related.length > 0 && (
        <section className="container-edit py-16 border-t rule">
          <h2 className="display-3 mb-8">Keep reading</h2>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </section>
      )}
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

const PROMPTS = [
  { id: "learned", label: "What did you learn?" },
  { id: "surprised", label: "What surprised you?" },
  { id: "question", label: "What question remains?" },
  { id: "perspective", label: "Your perspective" },
] as const;

type SortMode = "newest" | "top" | "oldest";

function KnowledgeCheckReflection({ articleId, story, title }: { articleId: string; story?: any; title?: string }) {
  const qc = useQueryClient();
  const send = useServerFn(postComment);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const reflectionMutation = useMutation({
    mutationFn: (text: string) =>
      send({ data: { articleId, body: text, promptType: "perspective" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.success("Your reflection was posted to the discussion");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <KnowledgeCheck
      articleId={articleId}
      story={story}
      title={title}
      onReflection={(text) => {
        if (signedIn) reflectionMutation.mutate(text);
      }}
    />
  );
}

function Discussion({ articleId }: { articleId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchComments = useServerFn(listComments);
  const send = useServerFn(postComment);
  const likeFn = useServerFn(toggleCommentLike);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState<typeof PROMPTS[number]["id"]>("perspective");
  const [body, setBody] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", articleId],
    queryFn: () => fetchComments({ data: { articleId } }),
  });

  const sortedComments = [...comments].sort((a, b) => {
    if (sort === "top") return (b.like_count ?? 0) - (a.like_count ?? 0);
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const mutation = useMutation({
    mutationFn: (input: { body: string; promptType: typeof PROMPTS[number]["id"] }) =>
      send({ data: { articleId, body: input.body, promptType: input.promptType } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", articleId] });
      toast.success("Posted to the discussion");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const likeMutation = useMutation({
    mutationFn: (commentId: string) => likeFn({ data: { commentId } }),
    onMutate: (commentId) => {
      setLikedComments((prev) => {
        const next = new Set(prev);
        if (next.has(commentId)) next.delete(commentId);
        else next.add(commentId);
        return next;
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", articleId] }),
    onError: () => toast.error("Could not update vote"),
  });

  return (
    <section className="container-read py-16 border-t rule">
      <div className="kicker mb-6">The Discussion</div>
      <h2 className="display-2 mb-8">A guided conversation</h2>

      {signedIn ? (
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
              {mutation.isPending ? "Posting…" : "Post to discussion"}
            </button>
          </div>
        </div>
      ) : (
        <div className="border rule p-6 flex items-center justify-between">
          <p className="dek not-italic font-sans text-sm">Sign in to contribute to the discussion.</p>
          <button
            onClick={() => router.navigate({ to: "/auth" })}
            className="border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            Sign in
          </button>
        </div>
      )}

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
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No contributions yet. Be the first.</p>
        )}
        {sortedComments.map((c: CommentRow) => {
          const isLiked = likedComments.has(c.id);
          const count = (c.like_count ?? 0) + (isLiked ? 1 : 0);
          return (
            <div key={c.id} className="border-t rule pt-6">
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-serif font-medium">
                  {c.author?.display_name || c.author?.username || "Reader"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.prompt_type && (
                    <span className="mr-3 kicker text-[0.6rem]">
                      {PROMPTS.find((p) => p.id === c.prompt_type)?.label ?? c.prompt_type}
                    </span>
                  )}
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
              <p className="font-serif text-lg leading-snug whitespace-pre-wrap">{c.body}</p>
              {signedIn && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => likeMutation.mutate(c.id)}
                    className={`flex items-center gap-1 text-sm transition ${isLiked ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {isLiked ? <ArrowBigUp className="h-4 w-4 fill-current" /> : <ArrowBigUp className="h-4 w-4" />}
                    <span>{count}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
