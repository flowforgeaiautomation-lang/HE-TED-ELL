import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { listArticles } from "@/lib/articles.functions";
import { curateNow, curateNowPublic } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { categoryLabel } from "@/lib/categories";
import { ArticleCard } from "@/components/article-card";
import { HomepageNav } from "@/components/HomepageNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { CategoryModal } from "@/components/CategoryModal";

const COUNTRY_LABELS: Record<string, string> = {
  IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia", CN: "China", JP: "Japan", BR: "Brazil", FR: "France", DE: "Germany", AE: "UAE", SG: "Singapore", ZA: "South Africa",
};

export const Route = createFileRoute("/discover")({
  validateSearch: (s: Record<string, unknown>) => ({
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Discover — The United Hell" },
      { name: "description", content: "Discover stories across topics, fields, eras, and cultures." },
      { property: "og:title", content: "Discover — The United Hell" },
      {
        property: "og:description",
        content: "Discover stories across topics, fields, eras, and cultures.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const search = useSearch({ from: "/discover" });
  const navigate = useNavigate();
  const [active, setActive] = useState<string | undefined>(search.category);
  const [showModal, setShowModal] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [country, setCountry] = useState<string>("WORLD");
  const ingestAuth = useServerFn(curateNow);
  const ingestPublic = useServerFn(curateNowPublic);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); 
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const readPrefs = () => setCountry(window.localStorage.getItem("tuh-country") || "WORLD");
    readPrefs();
    window.addEventListener("tuh-preferences", readPrefs);
    return () => window.removeEventListener("tuh-preferences", readPrefs);
  }, []);

  useEffect(() => {
    setActive(search.category);
  }, [search.category]);

  const q = useQuery(
    queryOptions({
      queryKey: ["discover", active ?? "all", country],
      queryFn: () => listArticles({ data: { limit: 36, category: active, country: country === "WORLD" ? undefined : country } }),
    }),
  );

  async function topUp() {
    setGenerating(true);
    try {
      let r: { inserted: number };
      if (signedIn) {
        r = await ingestAuth({ data: { maxItems: 60, category: active } });
      } else {
        r = await ingestPublic({ data: { maxItems: 12, category: active } });
      }
      if (r.inserted > 0) {
        toast.success(`${r.inserted} new stories added`);
        q.refetch();
      } else {
        toast.message("No new stories found right now — try again in a few minutes");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="container-edit py-10 md:py-14">
      <header className="border-b rule pb-6 mb-10">
        <div className="kicker">The Discovery Engine</div>
        <h1 className="display-1 mt-3">Explore beyond what you came for.</h1>
      </header>

      {/* Homepage Nav */}
      <HomepageNav 
        activeCategory={active} 
        onCategoryChange={(category) => {
          setActive(category);
          navigate({ to: "/discover", search: { category } });
        }}
        onExploreAllClick={() => setShowModal(true)}
      />

      {country !== "WORLD" && (
        <div className="mb-8 flex justify-center">
          <button
            onClick={() => {
              setActive(undefined);
              navigate({ to: "/discover", search: { category: undefined } });
            }}
            className={`border rule px-4 py-2 text-xs uppercase tracking-widest ${!active ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"}`}
          >
            {COUNTRY_LABELS[country] ?? country} news
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-b rule pb-3 mb-8">
        <div className="kicker">
          {active ? categoryLabel(active) : country === "WORLD" ? "Latest from all sections" : `Latest from ${COUNTRY_LABELS[country] ?? country}`}
        </div>
        <button
          onClick={topUp}
          disabled={generating}
          className="inline-flex items-center gap-2 border border-foreground px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" /> {generating ? "Curating…" : "Curate more"}
        </button>
      </div>
      {q.isLoading && <p className="dek">Loading…</p>}
      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((a) => (
          <ArticleCard key={a.id} article={a} variant="default" />
        ))}
      </div>
      {q.data && q.data.length === 0 && (
        <div className="text-center py-16">
          <p className="dek">Nothing here yet. Ask the AI to curate this category.</p>
          <button
            onClick={topUp}
            className="mt-4 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            Curate now
          </button>
        </div>
      )}

      <div className="mt-16 text-center">
        <Link to="/map" className="kicker hover:opacity-60">
          Or explore by country →
        </Link>
      </div>

      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
