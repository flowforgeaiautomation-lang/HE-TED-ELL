import { createFileRoute } from "@tanstack/react-router";

// Keys that the edge function is allowed to pass via X-Secret-* headers.
const ALLOWED_SECRET_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "QWEN3_80B_API_KEY",
  "QWEN3_CODER_480B_API_KEY",
  "LOVABLE_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "NEWSAPI_KEY",
  "GNEWS_KEY",
  "GNEWS_API_KEY",
  "PEXELS_API_KEY",
  "UNSPLASH_ACCESS_KEY",
  "NASA_API_KEY",
  "WORLDNEWS_API_KEY",
];

function injectSecretsFromHeaders(headers: Headers) {
  for (const key of ALLOWED_SECRET_KEYS) {
    const val = headers.get(`X-Secret-${key}`);
    if (val && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function handleIngest(params: { maxItems?: number; category?: string }, request?: Request) {
  // Inject secrets passed by the edge function before running ingestion
  if (request) {
    injectSecretsFromHeaders(request.headers);
  }
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
          return await handleIngest({ maxItems, category }, request);
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          let body: { maxItems?: number; category?: string } = {};
          try { body = await request.json(); } catch { body = {}; }
          return await handleIngest(body, request);
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
