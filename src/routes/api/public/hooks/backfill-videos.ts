import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/backfill-videos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);
          const { backfillVideos } = await import("@/lib/ingestion.server");
          const r = await backfillVideos({ limit });
          return Response.json({ ok: true, ...r, at: new Date().toISOString() });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
