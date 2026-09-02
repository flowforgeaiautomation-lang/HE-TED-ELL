import { createFileRoute } from "@tanstack/react-router";

// Diagnostic: reports which provider keys are present in the server runtime.
// Returns ONLY booleans + lengths, never the values themselves.
export const Route = createFileRoute("/api/public/hooks/debug-env")({
  server: {
    handlers: {
      GET: async () => {
        const keys = [
          "NEWSAPI_KEY",
          "GNEWS_KEY",
          "GNEWS_API_KEY",
          "PEXELS_API_KEY",
          "LOVABLE_API_KEY",
          "QWEN3_80B_API_KEY",
          "QWEN3_CODER_480B_API_KEY",
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
        ];
        const out: Record<string, { present: boolean; length: number }> = {};
        for (const k of keys) {
          const v = process.env[k];
          out[k] = { present: !!v, length: v ? v.length : 0 };
        }
        return Response.json(out);
      },
    },
  },
});
