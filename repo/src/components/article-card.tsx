import { Link } from "@tanstack/react-router";
import type { ArticleSummary } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";
import { fallbackCoverUrl } from "@/lib/article-images";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
function fmtDateShort(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

export function ArticleCard({
  article,
  variant = "default",
}: {
  article: ArticleSummary;
  variant?: "default" | "hero" | "compact" | "wide";
}) {
  if (variant === "hero") return <HeroCard article={article} />;
  if (variant === "compact") return <CompactCard article={article} />;
  if (variant === "wide") return <WideCard article={article} />;
  return <DefaultCard article={article} />;
}

function Meta({ article }: { article: ArticleSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="kicker">{categoryLabel(article.category)}</span>
      <span className="opacity-50">·</span>
      <span>{fmtDate(article.published_at)}</span>
    </div>
  );
}

function HeroCard({ article }: { article: ArticleSummary }) {
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  return (
    <Link
      to="/article/$slug"
      params={{ slug: article.slug }}
      preload="intent"
      className="group block hover-lift"
    >
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7 overflow-hidden">
          <img
            src={cover}
            alt={article.title}
            loading="eager"
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
        <div className="md:col-span-5 flex flex-col justify-center">
          <Meta article={article} />
          <h2 className="display-1 mt-4">{article.title}</h2>
          {article.dek && <p className="dek mt-4">{article.dek}</p>}
          <span className="mt-6 inline-block border-b border-foreground pb-0.5 text-sm font-medium w-fit">
            Read the story
          </span>
        </div>
      </div>
    </Link>
  );
}

function DefaultCard({ article }: { article: ArticleSummary }) {
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  return (
    <Link
      to="/article/$slug"
      params={{ slug: article.slug }}
      preload="intent"
      className="group flex flex-col hover-lift"
    >
      <div className="overflow-hidden">
        <img
          src={cover}
          alt={article.title}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <Meta article={article} />
        <h3 className="display-3 group-hover:underline decoration-1 underline-offset-4">
          {article.title}
        </h3>
        {article.dek && <p className="text-sm text-muted-foreground line-clamp-2">{article.dek}</p>}
      </div>
    </Link>
  );
}

function WideCard({ article }: { article: ArticleSummary }) {
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  return (
    <Link
      to="/article/$slug"
      params={{ slug: article.slug }}
      preload="intent"
      className="group grid gap-6 md:grid-cols-12 hover-lift border-t rule pt-8"
    >
      <div className="md:col-span-5 overflow-hidden">
        <img
          src={cover}
          alt={article.title}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      <div className="md:col-span-7 flex flex-col justify-center">
        <Meta article={article} />
        <h3 className="display-2 mt-3">{article.title}</h3>
        {article.dek && <p className="dek mt-3">{article.dek}</p>}
      </div>
    </Link>
  );
}

function CompactCard({ article }: { article: ArticleSummary }) {
  const cover = article.cover_image_url || fallbackCoverUrl(article);
  return (
    <Link
      to="/article/$slug"
      params={{ slug: article.slug }}
      preload="intent"
      className="group flex gap-4 items-start border-t rule pt-4"
    >
      <img
        src={cover}
        alt={article.title}
        loading="lazy"
        className="h-20 w-20 flex-none object-cover"
      />
      <div className="min-w-0">
        <span className="kicker text-[0.65rem]">{categoryLabel(article.category)}</span>
        <h4 className="font-serif font-medium text-base leading-snug mt-1 group-hover:underline decoration-1 underline-offset-2">
          {article.title}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">{fmtDateShort(article.published_at)}</p>
      </div>
    </Link>
  );
}
