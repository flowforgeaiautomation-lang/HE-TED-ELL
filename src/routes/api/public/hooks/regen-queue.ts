import { createFileRoute } from "@tanstack/react-router";

async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    let body: { limit?: number; seed?: number; articleIds?: string[] } = {};
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }
    const { drainRegenQueue, seedRegenQueue, enqueueRegeneration, regenQueueStats } =
      await import("@/lib/regen-queue.server");

    const seed = body.seed ?? (url.searchParams.get("seed") ? Number(url.searchParams.get("seed")) : 0);
    let seeded: unknown = null;
    if (seed && seed > 0) seeded = await seedRegenQueue(seed);

    const idsParam = url.searchParams.get("articleIds");
    const articleIds = body.articleIds ?? (idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined);
    if (articleIds?.length) await enqueueRegeneration(articleIds, "manual");

    if (url.searchParams.get("statsOnly") === "1") {
      return Response.json({ ok: true, ...(await regenQueueStats()), at: new Date().toISOString() });
    }

    const limit = Number(body.limit ?? url.searchParams.get("limit") ?? 10);
    const result = await drainRegenQueue({ limit });
    return Response.json({ ok: true, seeded, ...result, at: new Date().toISOString() });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/hooks/regen-queue")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
