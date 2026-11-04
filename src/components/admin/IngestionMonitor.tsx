import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type IngestionRun = {
  id: string;
  run_id: string;
  status: string;
  fetched_count: number;
  fresh_count: number;
  inserted_count: number;
  skipped_count: number;
  ai_generated_count: number;
  started_at: string;
  elapsed_ms: number | null;
  triggered_by: string;
};

const STATUS_STYLES: Record<string, string> = {
  success: "border-foreground text-foreground",
  partial: "border-foreground/60 text-foreground/80",
  failed: "border-destructive text-destructive",
  running: "border-foreground/40 text-muted-foreground",
};

export function IngestionMonitor() {
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("ingestion_logs" as never)
      .select("id, run_id, status, fetched_count, fresh_count, inserted_count, skipped_count, ai_generated_count, started_at, elapsed_ms, triggered_by")
      .order("started_at", { ascending: false })
      .limit(20);
    if (queryError) {
      setError(queryError.message);
    } else {
      setRuns(Array.isArray(data) ? (data as IngestionRun[]) : []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="border rule p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="kicker">Ingestion monitor</div>
        <button
          onClick={load}
          disabled={loading}
          className="border rule px-3 py-1 text-[0.65rem] uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-sm mt-3 text-destructive">Could not load ingestion runs: {error}</p>}

      {!error && !loading && runs.length === 0 && (
        <p className="text-sm mt-3 text-muted-foreground">No ingestion runs recorded yet.</p>
      )}

      {runs.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b rule">
                <th className="py-2 pr-3 font-medium">Started</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Trigger</th>
                <th className="py-2 pr-3 font-medium text-right">Fetched</th>
                <th className="py-2 pr-3 font-medium text-right">Fresh</th>
                <th className="py-2 pr-3 font-medium text-right">Inserted</th>
                <th className="py-2 pr-3 font-medium text-right">Skipped</th>
                <th className="py-2 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b rule/50">
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(run.started_at).toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    <span className={`border px-1.5 py-0.5 uppercase tracking-wider text-[0.6rem] ${STATUS_STYLES[run.status] ?? "border-foreground/40"}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{run.triggered_by}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{run.fetched_count}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{run.fresh_count}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{run.inserted_count}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{run.skipped_count}</td>
                  <td className="py-2 text-right tabular-nums">
                    {run.elapsed_ms != null ? `${Math.round(run.elapsed_ms / 1000)}s` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
