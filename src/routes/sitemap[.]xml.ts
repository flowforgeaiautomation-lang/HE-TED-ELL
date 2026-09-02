import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";
import { BOOKS } from "@/lib/editions-data";
import { getSupabaseUrl, getSupabasePublishableKey } from "@/lib/supabase-config";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sUrl = getSupabaseUrl();
        const sKey = getSupabasePublishableKey();
        const supabase = createClient(sUrl, sKey, {
          global: { fetch: createSupabaseFetch(sKey) },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data } = await supabase
          .from("articles")
          .select("slug, published_at, updated_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(5000);

        const staticPaths = [
          { path: "/", changefreq: "hourly", priority: "1.0" },
          { path: "/briefing", changefreq: "hourly", priority: "0.9" },
          { path: "/discover", changefreq: "hourly", priority: "0.8" },
          { path: "/world", changefreq: "hourly", priority: "0.8" },
          { path: "/map", changefreq: "daily", priority: "0.7" },
          { path: "/trending", changefreq: "hourly", priority: "0.8" },
          { path: "/search", changefreq: "weekly", priority: "0.4" },
          { path: "/information", changefreq: "monthly", priority: "0.3" },
          { path: "/editions", changefreq: "weekly", priority: "0.7" },
        ];

        type Entry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };
        const entries: Entry[] = [
          ...staticPaths.map((s) => ({ loc: SITE_URL + s.path, changefreq: s.changefreq, priority: s.priority })),
          ...BOOKS.map((b) => ({
            loc: SITE_URL + "/editions/" + b.slug,
            changefreq: "weekly" as const,
            priority: "0.6" as const,
          })),
          ...((data ?? []) as { slug: string; published_at: string; updated_at?: string }[]).map((a) => ({
            loc: SITE_URL + "/article/" + a.slug,
            lastmod: a.updated_at || a.published_at,
            changefreq: "weekly",
            priority: "0.6",
          })),
        ];

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...entries.map((e) =>
            [
              "  <url>",
              `    <loc>${e.loc}</loc>`,
              e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              "  </url>",
            ].filter(Boolean).join("\n"),
          ),
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
