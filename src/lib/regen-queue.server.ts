// Persistent regeneration retry queue.
// Articles whose AI rewrite fails (missing credits, invalid keys, provider
// outage, unreachable source) are parked here and retried automatically with
// exponential backoff until they succeed. Nothing is ever dropped silently.
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabasePublishableKey } from "./supabase-config";

const MAX_BACKOFF_MINUTES = 360; // 6 hours
const BASE_BACKOFF_MINUTES = 2;

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

function admin() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabasePublishableKey();
  return createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function backoffMinutes(attempts: number) {
  return Math.min(BASE_BACKOFF_MINUTES * Math.pow(2, Math.max(attempts - 1, 0)), MAX_BACKOFF_MINUTES);
}

/** Park article ids for a future rewrite attempt (idempotent). */
export async function enqueueRegeneration(articleIds: string[], reason?: string) {
  const ids = [...new Set(articleIds.filter(Boolean))];
  if (!ids.length) return { queued: 0 };
  const supabase = admin();
  const { data: existing } = await supabase
    .from("article_regen_queue")
    .select("article_id")
    .in("article_id", ids);
  const known = new Set((existing ?? []).map((r: { article_id: string }) => r.article_id));
  const fresh = ids.filter((id) => !known.has(id));
  if (fresh.length) {
    await supabase.from("article_regen_queue").insert(
      fresh.map((article_id) => ({
        article_id,
        status: "pending",
        last_error: reason ?? null,
        next_attempt_at: new Date().toISOString(),
      })),
    );
  }
  // Re-arm anything that had been marked done/held so it retries again.
  if (known.size) {
    await supabase
      .from("article_regen_queue")
      .update({ status: "pending", last_error: reason ?? null })
      .in("article_id", [...known])
      .neq("status", "pending");
  }
  return { queued: ids.length, inserted: fresh.length };
}

/** Enqueue every article that has never been successfully regenerated. */
export async function seedRegenQueue(limit = 500) {
  const supabase = admin();
  const { data } = await supabase
    .from("articles")
    .select("id")
    .is("reprocessed_at", null)
    .order("published_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 2000));
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  return enqueueRegeneration(ids, "seeded");
}

/**
 * Drain due queue entries. Safe to call on a schedule — when AI credits/keys
 * are invalid every item simply fails, backs off, and is retried later.
 */
export async function drainRegenQueue(opts?: { limit?: number }) {
  const supabase = admin();
  const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 50);
  const nowIso = new Date().toISOString();

  const { data: due } = await supabase
    .from("article_regen_queue")
    .select("id, article_id, attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  const rows = (due ?? []) as Array<{ id: string; article_id: string; attempts: number }>;
  if (!rows.length) {
    const { count } = await supabase
      .from("article_regen_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return { attempted: 0, succeeded: 0, retried: 0, pending: count ?? 0 };
  }

  await supabase
    .from("article_regen_queue")
    .update({ status: "processing" })
    .in("id", rows.map((r) => r.id));

  const { reprocessBatch } = await import("@/lib/ingestion.server");

  let succeeded = 0;
  let retried = 0;

  for (const row of rows) {
    let ok = false;
    let error = "";
    try {
      const res = await reprocessBatch({ articleIds: [row.article_id], force: true, limit: 1, skipQueue: true });
      ok = res.updated > 0;
      if (!ok) error = "AI rewrite did not produce a publishable article";
    } catch (e) {
      error = (e as Error).message?.slice(0, 500) || "unknown error";
    }

    if (ok) {
      succeeded++;
      await supabase
        .from("article_regen_queue")
        .update({ status: "done", last_error: null, attempts: row.attempts + 1 })
        .eq("id", row.id);
    } else {
      retried++;
      const attempts = row.attempts + 1;
      await supabase
        .from("article_regen_queue")
        .update({
          status: "pending",
          attempts,
          last_error: error,
          next_attempt_at: new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString(),
        })
        .eq("id", row.id);
    }
  }

  const { count } = await supabase
    .from("article_regen_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return { attempted: rows.length, succeeded, retried, pending: count ?? 0 };
}

export async function regenQueueStats() {
  const supabase = admin();
  const counts: Record<string, number> = {};
  for (const status of ["pending", "processing", "done"]) {
    const { count } = await supabase
      .from("article_regen_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    counts[status] = count ?? 0;
  }
  const { data: recent } = await supabase
    .from("article_regen_queue")
    .select("article_id, attempts, last_error, next_attempt_at")
    .eq("status", "pending")
    .order("attempts", { ascending: false })
    .limit(5);
  return { counts, recent: recent ?? [] };
}
