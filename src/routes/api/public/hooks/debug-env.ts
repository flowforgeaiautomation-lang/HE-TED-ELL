import { createFileRoute } from "@tanstack/react-router";
import { getProviderRegistry } from "@/lib/enrichment-providers";

// Diagnostic: reports which provider keys are present in the server runtime.
// Returns ONLY booleans + lengths, never the values themselves.
export const Route = createFileRoute("/api/public/hooks/debug-env")({
  server: {
    handlers: {
      GET: async () => {
        const registry = getProviderRegistry();
        const out: Record<string, { present: boolean; length: number; status: string; name: string; purpose: string }> = {};
        for (const p of registry) {
          const v = process.env[p.envVar];
          out[p.envVar] = {
            present: !!v,
            length: v ? v.length : 0,
            status: v ? p.status : "MISSING",
            name: p.name,
            purpose: p.purpose,
          };
        }
        return Response.json({ providers: out, total: registry.length });
      },
    },
  },
});
