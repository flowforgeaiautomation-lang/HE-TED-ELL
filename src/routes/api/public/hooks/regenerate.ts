import { createFileRoute } from "@tanstack/react-router";

async function handleRegenerate(request: Request) {
  try {
    const url = new URL(request.url);
    let slug = url.searchParams.get("slug") || "";
    if (!slug) {
      let body: any = null;
      try { body = await request.json(); } catch {}
      slug = body?.slug || "";
    }
    if (!slug) {
      return Response.json({ ok: false, error: "Missing slug parameter" }, { status: 400 });
    }
    const { regenerateArticleBySlug } = await import("@/lib/ingestion.server");
    const result = await regenerateArticleBySlug(slug);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/hooks/regenerate")({
  server: {
    handlers: {
      GET: async ({ request }) => handleRegenerate(request),
      POST: async ({ request }) => handleRegenerate(request),
    },
  },
});
