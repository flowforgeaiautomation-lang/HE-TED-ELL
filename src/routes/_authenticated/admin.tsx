import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { reprocessArticles, curateNow } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — The United Hell" }] }),
  component: AdminPage,
});

function AdminPage() {
  const reprocess = useServerFn(reprocessArticles);
  const curate = useServerFn(curateNow);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [totalUpdated, setTotalUpdated] = useState(0);
  const stopRef = useRef(false);

  function append(line: string) {
    setLog((l) => [line, ...l].slice(0, 200));
  }

  async function reprocessAll() {
    setRunning(true);
    stopRef.current = false;
    setTotalUpdated(0);
    append("Starting reprocess loop…");
    try {
      let iter = 0;
      while (!stopRef.current) {
        iter++;
        const r = await reprocess({ data: { limit: 8 } });
        setRemaining(r.remaining);
        setTotalUpdated((n) => n + r.updated);
        append(`Batch ${iter}: updated ${r.updated}, failed ${r.failed}, remaining ${r.remaining}`);
        if (r.remaining === 0 || r.attempted === 0) {
          append("Done — no more articles to reprocess.");
          break;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e) {
      append("Error: " + (e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  async function runCurate() {
    setRunning(true);
    try {
      const r = await curate({ data: { maxItems: 60 } });
      append(`Curate: inserted ${r.inserted}, fetched ${r.fetched}, errors ${r.errors}`);
      toast.success(`Inserted ${r.inserted} new stories`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    // Kick off initial remaining count
    reprocess({ data: { limit: 1 } }).then((r: { remaining: number }) => setRemaining(r.remaining)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-read py-12">
      <div className="kicker">Editorial ops</div>
      <h1 className="display-1 mt-2">Admin.</h1>
      <p className="dek mt-3">Reprocess existing articles through the new editorial engine, or trigger a live curate cycle.</p>

      <div className="mt-8 grid gap-4">
        <div className="border rule p-5">
          <div className="kicker">Reprocess all articles</div>
          <p className="text-sm mt-2">Remaining unprocessed: <strong>{remaining ?? "—"}</strong>. Updated this session: <strong>{totalUpdated}</strong>.</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={reprocessAll}
              disabled={running}
              className="border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
            >
              {running ? "Running…" : "Reprocess all"}
            </button>
            <button
              onClick={() => { stopRef.current = true; }}
              disabled={!running}
              className="border rule px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-40"
            >
              Stop
            </button>
          </div>
        </div>

        <div className="border rule p-5">
          <div className="kicker">Curate now</div>
          <p className="text-sm mt-2">Pull fresh news from every source and run through the new engine.</p>
          <button
            onClick={runCurate}
            disabled={running}
            className="mt-4 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
          >
            {running ? "Running…" : "Run curate cycle"}
          </button>
        </div>

        <div className="border rule p-5">
          <div className="kicker">Log</div>
          <pre className="text-xs mt-3 whitespace-pre-wrap font-mono max-h-96 overflow-auto">
            {log.join("\n") || "No activity yet."}
          </pre>
        </div>
      </div>
    </div>
  );
}
