import { createFileRoute } from "@tanstack/react-router";

async function handleReprocess(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 200);
    const force = url.searchParams.get("force") === "true";
    const { reprocessBatch, drainRegenerationQueue } = await import("@/lib/ingestion.server");
    const r = await reprocessBatch({ limit, force });
    const rq = await drainRegenerationQueue({ limit: 10 });
    return Response.json({ ok: true, ...r, retryQueue: rq, at: new Date().toISOString() });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/hooks/reprocess")({
  server: {
    handlers: {
      GET: async ({ request }) => handleReprocess(request),
      POST: async ({ request }) => handleReprocess(request),
    },
  },
});
