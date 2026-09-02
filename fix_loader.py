import os

filepath = '/tmp/theunitedhell-clone/src/routes/article.$slug.tsx'
with open(filepath, 'r') as f:
    content = f.read()

old_imports = '''import { getArticleBySlug, getRelated, listComments } from "@/lib/articles.functions";'''
new_imports = '''import { getArticleBySlug, getRelated, listComments } from "@/lib/articles.functions";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";'''
content = content.replace(old_imports, new_imports)

old_loader = '''export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    try {
      const a = await context.queryClient.ensureQueryData(articleQ(params.slug));
      if (!a) throw notFound();
      return { article: a };
    } catch (e) {
      // If it's a notFound error, propagate it
      if (e && typeof e === 'object' && 'status' in e && (e as any).status === 404) throw e;
      // For any other error (e.g. server function not available during SSR on Vercel),
      // don't crash - let the client-side useSuspenseQuery handle data loading
      console.error("[article loader] SSR fallback:", e);
      return { article: null };
    }
  },'''

new_loader = '''function directSupabaseClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "https://0ec90b57d6e95fcbda19832f.supabase.co",
    process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw",
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    try {
      const a = await context.queryClient.ensureQueryData(articleQ(params.slug));
      if (!a) throw notFound();
      return { article: a };
    } catch (e) {
      if (e && typeof e === 'object' && 'status' in e && (e as any).status === 404) throw e;
      try {
        const supabase = directSupabaseClient();
        const { data: row, error } = await supabase
          .from("articles")
          .select("*")
          .eq("slug", params.slug)
          .eq("is_published", true)
          .maybeSingle();
        if (error) throw error;
        if (!row) throw notFound();
        return { article: row as any };
      } catch (e2) {
        if (e2 && typeof e2 === 'object' && 'status' in e2 && (e2 as any).status === 404) throw e2;
        console.error("[article loader] SSR fallback failed:", e2);
        return { article: null };
      }
    }
  },'''

content = content.replace(old_loader, new_loader)

with open(filepath, 'w') as f:
    f.write(content)

print("Loader updated with direct Supabase fallback")
