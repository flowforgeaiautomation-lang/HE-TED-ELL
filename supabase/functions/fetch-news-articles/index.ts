import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Call the trending score update function
    try {
      await supabase.rpc("update_trending_scores");
    } catch {}

    // Trigger ingestion by calling the app's server function endpoint
    // The actual ingestion logic lives in the app's server code
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(".supabase.co", ".bolt.new");
    const authKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let ingestionResult = null;
    try {
      const resp = await fetch(`${appUrl}/api/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({ mode: "cron", maxItems: 30 }),
      });
      if (resp.ok) {
        ingestionResult = await resp.json();
      }
    } catch (e) {
      console.error("[fetch-news-articles] ingestion call failed:", (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "News article fetch triggered",
        ingestion: ingestionResult,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[fetch-news-articles] error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
