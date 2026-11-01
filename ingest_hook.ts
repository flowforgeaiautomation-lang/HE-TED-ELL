import { createFileRoute } from "@tanstack/react-router";

async function handleIngest(params: { maxItems?: number; category?: string }) {
  const { runIngestion } = await import("@/lib/ingestion.server");
  const r = await runIngestion({
    maxItems: Math.min(Math.max(Number(params.maxItems ?? 80), 1), 120),
    priorityCategory: typeof params.category === "string" ? params.category : undefined,
    mode: "cron",
  });
  return Response.json({ ok: true, ...r, at: new Date().toISOString() });
}

export const Route = createFileRoute("/api/public/hooks/ingest")({
  server: {
    handlers: {
      // Vercel crons fire GET — must run ingestion here too
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const maxItems = Number(url.searchParams.get("maxItems") ?? 80);
          const category = url.searchParams.get("category") ?? undefined;
          return await handleIngest({ maxItems, category });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          let body: { maxItems?: number; category?: string } = {};
          try { body = await request.json(); } catch { body = {}; }
          return await handleIngest(body);
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
