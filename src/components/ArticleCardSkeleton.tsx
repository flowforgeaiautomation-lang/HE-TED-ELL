/**
 * Premium shimmer skeleton matching the shape of ArticleCard (default + compact).
 * Use instead of blank pages / spinners while articles load.
 */
export function ArticleCardSkeleton({ variant = "default" }: { variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex gap-4 items-start border-t rule pt-4">
        <div className="h-20 w-20 flex-none animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-1/4 animate-pulse bg-foreground/[0.08] rounded-sm" />
          <div className="h-4 w-full animate-pulse bg-foreground/[0.08] rounded-sm" />
          <div className="h-4 w-2/3 animate-pulse bg-foreground/[0.08] rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="aspect-[4/3] w-full animate-pulse bg-foreground/[0.08] rounded-sm" />
      <div className="mt-4 flex flex-col gap-3">
        <div className="h-3 w-1/4 animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="h-5 w-full animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="h-5 w-4/5 animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="h-4 w-2/3 animate-pulse bg-foreground/[0.08] rounded-sm" />
      </div>
    </div>
  );
}

export function ArticleCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroCardSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-12">
      <div className="md:col-span-7">
        <div className="aspect-[16/10] w-full animate-pulse bg-foreground/[0.08] rounded-sm" />
      </div>
      <div className="md:col-span-5 flex flex-col justify-center gap-4">
        <div className="h-3 w-1/4 animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="h-8 w-full animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="h-8 w-3/4 animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="h-4 w-full animate-pulse bg-foreground/[0.08] rounded-sm" />
        <div className="h-4 w-2/3 animate-pulse bg-foreground/[0.08] rounded-sm" />
      </div>
    </div>
  );
}
