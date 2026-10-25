import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/backfill-quizzes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = Number(url.searchParams.get("limit") ?? 20);
          const { backfillQuizzes } = await import("@/lib/ingestion.server");
          const r = await backfillQuizzes({ limit: Math.min(Math.max(limit, 1), 50) });
          return Response.json({ ok: true, ...r, at: new Date().toISOString() });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          let body: { limit?: number } = {};
          try { body = await request.json(); } catch { body = {}; }
          const { backfillQuizzes } = await import("@/lib/ingestion.server");
          const r = await backfillQuizzes({ limit: Math.min(Math.max(body.limit ?? 20, 1), 50) });
          return Response.json({ ok: true, ...r, at: new Date().toISOString() });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
