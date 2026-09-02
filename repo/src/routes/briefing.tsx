import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getBriefingToday } from "@/lib/articles.functions";

const briefingQ = queryOptions({ queryKey: ["briefing"], queryFn: () => getBriefingToday() });

export const Route = createFileRoute("/briefing")({
  head: () => ({
    meta: [
      { title: "Daily Earth Briefing — The United Hell" },
      {
        name: "description",
        content: "Today's most important discoveries, sciences, and stories — curated daily.",
      },
      { property: "og:title", content: "Daily Earth Briefing — The United Hell" },
      {
        property: "og:description",
        content: "Today's most important discoveries, sciences, and stories.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(briefingQ),
  component: BriefingPage,
  errorComponent: ({ error }) => (
    <div className="container-read py-20"><p className="dek">Could not load briefing: {error.message}</p></div>
  ),
  notFoundComponent: () => null,
});

function BriefingPage() {
  const { data: briefing } = useSuspenseQuery(briefingQ);
  const dateStr = briefing
    ? new Date(briefing.briefing_date).toLocaleDateString(undefined, { dateStyle: "full" })
    : new Date().toLocaleDateString(undefined, { dateStyle: "full" });

  return (
    <div className="container-edit py-10 md:py-16">
      <header className="text-center border-b rule pb-10 mb-12">
        <div className="kicker">{dateStr}</div>
        <h1 className="display-1 mt-4">The Daily Earth Briefing</h1>
        {briefing?.intro && <p className="dek mt-4 max-w-2xl mx-auto">{briefing.intro}</p>}
      </header>

      {!briefing ? (
        <p className="dek text-center">Today's briefing is being assembled.</p>
      ) : (
        <div className="grid gap-16">
          <Section title="Top Stories" items={briefing.sections.top_stories} />
          <Section title="Discoveries" items={briefing.sections.discoveries} />
          <Section title="Science" items={briefing.sections.science} />
          <Section title="Success Stories" items={briefing.sections.success} />
          <Section title="Emerging Technology" items={briefing.sections.tech} />
          {briefing.sections.facts && (
            <section>
              <div className="kicker mb-6 text-center">Fascinating Facts</div>
              <ul className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
                {briefing.sections.facts.map((f, i) => (
                  <li key={i} className="border-t rule pt-4 font-serif text-lg">
                    <span className="text-muted-foreground tabular-nums mr-3">{String(i + 1).padStart(2, "0")}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items?: { slug: string; title: string }[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between border-b rule pb-3 mb-6">
        <h2 className="display-3">{title}</h2>
        <div className="kicker">{items.length} items</div>
      </div>
      <ol className="space-y-4">
        {items.map((it, i) => (
          <li key={it.slug} className="flex gap-5 border-b rule pb-4">
            <span className="font-serif text-3xl text-muted-foreground tabular-nums leading-none w-12">
              {String(i + 1).padStart(2, "0")}
            </span>
            <Link to="/article/$slug" params={{ slug: it.slug }} className="font-serif text-xl md:text-2xl hover:underline underline-offset-4">
              {it.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
