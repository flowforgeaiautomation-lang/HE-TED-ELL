import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getArticleBySlug, getRelated, listComments } from "@/lib/articles.functions";
import { postComment } from "@/lib/interactions.functions";
import { ArticleActions } from "@/components/article-actions";
import { ArticleCard } from "@/components/article-card";
import { categoryLabel } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Quote } from "lucide-react";
import type { CommentRow } from "@/lib/types";
import { fallbackCoverUrl } from "@/lib/article-images";
import { WordSearch } from "@/components/word-search";

const articleQ = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: () => getArticleBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    const a = await context.queryClient.ensureQueryData(articleQ(params.slug));
    if (!a) throw notFound();
    return { article: a };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a)
      return {
        meta: [
          { title: "Story not found — The United Hell" },
        ],
      };
    return {
      meta: [
        { title: `${a.title} — The United Hell` },
        { name: "description", content: a.dek ?? a.title },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.dek ?? a.title },
        ...(a.cover_image_url ? [{ property: "og:image", content: a.cover_image_url }] : []),
        ...(a.cover_image_url ? [{ name: "twitter:image", content: a.cover_image_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
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
      <Link to="/" className="mt-6 inline-block kicker hover:opacity-60">← Front page</Link>
    </div>
  ),
});

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

  return (
    <article>
      {/* Hero */}
      <header className="container-read pt-10 md:pt-16 text-center">
        <div className="kicker">{categoryLabel(article.category)}</div>
        <h1 className="display-1 mt-5">{article.title}</h1>
        {article.dek && <p className="dek mt-6 text-balance">{article.dek}</p>}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>{new Date(article.published_at).toLocaleDateString(undefined, { dateStyle: "long" })}</span>
          <span className="opacity-50">·</span>
          <span>{categoryLabel(article.category)}</span>
        </div>
        <div className="mt-6 flex justify-center">
          <ArticleActions articleId={article.id} title={article.title} />
        </div>
      </header>

      <figure className="container-edit mt-10">
        <img
          src={cover}
          alt={article.title}
          className="w-full max-h-[70vh] object-cover"
        />
      </figure>

      {/* Story Mode */}
      <section className="container-read py-12 md:py-16">
        <div className="grid gap-10">
          <StoryBlock label="Quick Summary" body={story.summary} />
          <StoryBlock label="Main Story" body={story.main_story} />

          {story.background && <StoryBlock label="Background" body={story.background} />}

          {story.key_developments && story.key_developments.length > 0 && (
            <ListBlock label="Key Developments" items={story.key_developments} />
          )}

          {story.quick_insights && story.quick_insights.length > 0 && (
            <ListBlock label="Quick Insights" items={story.quick_insights} />
          )}

          {story.expert_analysis && <StoryBlock label="Expert Insights" body={story.expert_analysis} />}

          {story.timeline && story.timeline.length > 0 && (
            <ListBlock label="Timeline" items={story.timeline} />
          )}

          <div className="border-y rule py-10">
            <div className="kicker mb-6">Vocabulary Builder</div>
            {story.vocabulary && story.vocabulary.length > 0 ? (
              <div className="grid gap-6">
                {story.vocabulary.map((v, i) => (
                  <div key={`${v.word}-${i}`} className="border-l-2 border-foreground/20 pl-5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-serif text-2xl">{v.word}</h3>
                      {v.pronunciation && (
                        <span className="text-sm text-muted-foreground italic">{v.pronunciation}</span>
                      )}
                      {v.partOfSpeech && (
                        <span className="text-xs uppercase tracking-widest text-muted-foreground border rule px-2 py-0.5">
                          {v.partOfSpeech}
                        </span>
                      )}
                    </div>
                    {v.meaning && (
                      <p className="mt-2 text-base text-foreground/90 leading-relaxed">
                        <span className="font-semibold">Meaning:</span> {v.meaning}
                      </p>
                    )}
                    {v.simpleExplanation && (
                      <p className="mt-1 text-sm text-foreground/70 leading-relaxed">
                        {v.simpleExplanation}
                      </p>
                    )}
                    {v.example && (
                      <p className="mt-2 text-sm text-muted-foreground italic leading-relaxed border-l-2 border-foreground/10 pl-3">
                        {v.example}
                      </p>
                    )}
                    {(v.synonyms?.length || v.antonyms?.length) && (
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        {v.synonyms?.length ? (
                          <div>
                            <span className="font-semibold text-foreground/80">Synonyms:</span>{" "}
                            <span className="text-muted-foreground">{v.synonyms.join(", ")}</span>
                          </div>
                        ) : null}
                        {v.antonyms?.length ? (
                          <div>
                            <span className="font-semibold text-foreground/80">Antonyms:</span>{" "}
                            <span className="text-muted-foreground">{v.antonyms.join(", ")}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No vocabulary highlights for this article yet.
              </p>
            )}

            <WordSearch />
          </div>


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
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="font-serif text-xl md:text-2xl leading-snug">{paragraph}</p>
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

function Discussion({ articleId }: { articleId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchComments = useServerFn(listComments);
  const send = useServerFn(postComment);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState<typeof PROMPTS[number]["id"]>("perspective");
  const [body, setBody] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", articleId],
    queryFn: () => fetchComments({ data: { articleId } }),
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

      <div className="mt-10 space-y-8">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No contributions yet. Be the first.</p>
        )}
        {comments.map((c: CommentRow) => (
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
          </div>
        ))}
      </div>
    </section>
  );
}
