import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Authenticated AI top-up. Any signed-in user can generate fresh articles from real ingestion only.
export const generateArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.string().optional(),
        count: z.number().int().min(1).max(4).default(2),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { runIngestion } = await import("./ingestion.server");
    const result = await runIngestion({ maxItems: Math.max(6, data.count * 6), priorityCategory: data.category, mode: "manual" });
    return { inserted: result.inserted };
  });

// Authenticated "Curate Now" — runs the real ingestion pipeline immediately.
// Pulls fresh items from NewsAPI + GNews + RSS + Wikipedia, processes with Qwen,
// fetches Pexels covers when missing, and inserts new articles.
export const curateNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ maxItems: z.number().int().min(1).max(120).default(36), category: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { runIngestion } = await import("./ingestion.server");
    return await runIngestion({ maxItems: data.maxItems, priorityCategory: data.category, mode: "manual" });
  });

// Public curate — no auth required, limited to 20 items.
export const curateNowPublic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ maxItems: z.number().int().min(1).max(20).default(12), category: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { runIngestion } = await import("./ingestion.server");
    return await runIngestion({ maxItems: data.maxItems, priorityCategory: data.category, mode: "cron" });
  });

// Reprocess a batch of existing articles through the new editorial engine.
// Signed-in users can trigger this; the /admin/reprocess page loops it until done.
export const reprocessArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(20).default(8) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { reprocessBatch } = await import("./ingestion.server");
    return await reprocessBatch({ limit: data.limit });
  });
