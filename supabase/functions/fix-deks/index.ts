import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function truncateAtSentence(inputText: string | null | undefined, maxChars = 280): string | null {
  if (!inputText) return null;
  let cleaned = inputText.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/([a-z])\.([A-Z])/g, "$1. $2");
  cleaned = cleaned.replace(/([a-z]{4,})([A-Z])/g, "$1. $2");
  if (cleaned.length <= maxChars) return cleaned;
  const sentences = cleaned.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).filter(s => s.trim());
  let result = "";
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;
    if (!result) { result = s; }
    else if (result.length + 1 + s.length <= maxChars) { result = result + " " + s; }
    else { break; }
  }
  if (!result) result = cleaned.slice(0, maxChars);
  return result.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: articles, error: fetchError } = await supabase
      .from("articles")
      .select("id, dek, story");
    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let updated = 0;
    let skipped = 0;
    for (const article of articles || []) {
      const dek = article.dek as string;
      if (!dek || dek.length <= 100) { skipped++; continue; }
      if (!/[a-z]\.$/.test(dek)) { skipped++; continue; }
      const story = article.story as Record<string, unknown>;
      const mainStory = (story?.main_story as string) || (story?.summary as string) || dek;
      const newDek = truncateAtSentence(mainStory, 280);
      if (newDek && newDek !== dek) {
        const { error: updateError } = await supabase
          .from("articles")
          .update({ dek: newDek })
          .eq("id", article.id);
        if (updateError) {
          console.error("Failed: " + article.id);
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    }
    return new Response(
      JSON.stringify({ success: true, updated, skipped, total: articles?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
