import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const BASE_URL = "";
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
        );
        const { data } = await supabase
          .from("articles")
          .select("slug, published_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(500);

        const staticPaths = [
          { path: "/", changefreq: "hourly", priority: "1.0" },
          { path: "/briefing", changefreq: "hourly", priority: "0.9" },
          { path: "/discover", changefreq: "hourly", priority: "0.8" },
          { path: "/map", changefreq: "daily", priority: "0.7" },
          { path: "/trending", changefreq: "hourly", priority: "0.8" },
          { path: "/search", changefreq: "weekly", priority: "0.4" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
        ];

        type Entry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };
        const entries: Entry[] = [
          ...staticPaths.map((s) => ({ loc: BASE_URL + s.path, changefreq: s.changefreq, priority: s.priority })),
          ...((data ?? []) as { slug: string; published_at: string }[]).map((a) => ({
            loc: BASE_URL + "/article/" + a.slug,
            lastmod: a.published_at,
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
