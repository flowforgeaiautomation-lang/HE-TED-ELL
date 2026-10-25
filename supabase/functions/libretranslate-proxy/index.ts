import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "nb", name: "Norwegian Bokmål" },
  { code: "nn", name: "Norwegian Nynorsk" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
  { code: "ur", name: "Urdu" },
  { code: "or", name: "Odia" },
  { code: "as", name: "Assamese" },
  { code: "sa", name: "Sanskrit" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "ko", name: "Korean" },
  { code: "tr", name: "Turkish" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "is", name: "Icelandic" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "uk", name: "Ukrainian" },
  { code: "he", name: "Hebrew" },
  { code: "el", name: "Greek" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "ro", name: "Romanian" },
  { code: "bg", name: "Bulgarian" },
  { code: "hr", name: "Croatian" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "lt", name: "Lithuanian" },
  { code: "lv", name: "Latvian" },
  { code: "et", name: "Estonian" },
  { code: "fa", name: "Persian" },
  { code: "ms", name: "Malay" },
  { code: "tl", name: "Filipino" },
  { code: "sw", name: "Swahili" },
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "az", name: "Azerbaijani" },
  { code: "be", name: "Belarusian" },
  { code: "bs", name: "Bosnian" },
  { code: "ca", name: "Catalan" },
  { code: "cy", name: "Welsh" },
  { code: "eo", name: "Esperanto" },
  { code: "eu", name: "Basque" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "ga", name: "Irish" },
  { code: "la", name: "Latin" },
  { code: "lb", name: "Luxembourgish" },
  { code: "mk", name: "Macedonian" },
  { code: "mn", name: "Mongolian" },
  { code: "ne", name: "Nepali" },
  { code: "ps", name: "Pashto" },
  { code: "sd", name: "Sindhi" },
  { code: "si", name: "Sinhala" },
  { code: "sr", name: "Serbian" },
  { code: "tg", name: "Tajik" },
  { code: "uz", name: "Uzbek" },
  { code: "yi", name: "Yiddish" },
  { code: "zu", name: "Zulu" },
  { code: "xh", name: "Xhosa" },
  { code: "st", name: "Southern Sotho" },
  { code: "sn", name: "Shona" },
  { code: "so", name: "Somali" },
  { code: "tk", name: "Turkmen" },
  { code: "tt", name: "Tatar" },
  { code: "ug", name: "Uyghur" },
  { code: "yo", name: "Yoruba" },
];

// Try a real self-hosted LibreTranslate instance first.
// Set LIBRETRANSLATE_URL in Edge Function secrets to use it.
// Without it, we fall back to Google Translate free + MyMemory.
function getLibreTranslateUrl(): string | null {
  return Deno.env.get("LIBRETRANSLATE_URL") || null;
}

async function libreTranslate(text: string, source: string, target: string): Promise<string> {
  const baseUrl = getLibreTranslateUrl();
  if (!baseUrl) throw new Error("LIBRETRANSLATE_URL not configured");
  const apiKey = Deno.env.get("LIBRETRANSLATE_API_KEY");
  const body: Record<string, string> = {
    q: text,
    source: source === "auto" ? "auto" : source,
    target,
    format: "text",
  };
  if (apiKey) body.api_key = apiKey;
  const res = await fetch(`${baseUrl}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`LibreTranslate ${res.status}`);
  const data = await res.json();
  if (!data?.translatedText) throw new Error("LibreTranslate: no translatedText");
  return data.translatedText;
}

// Google Translate free endpoint — no API key required.
async function googleTranslateFree(text: string, source: string, target: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TheUnitedHell/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Google Translate ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("Google Translate: unexpected response");
  const translated = (data[0] as any[][])
    .map((segment) => (Array.isArray(segment) && segment[0]) ? segment[0] : "")
    .join("");
  return translated || text;
}

// MyMemory as last-resort fallback — free, no API key, 500 chars per request
async function myMemoryTranslate(text: string, source: string, target: string): Promise<string> {
  const truncated = text.slice(0, 500);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncated)}&langpair=${source}|${target}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("MyMemory: no translation returned");
  return translated;
}

// Provider cascade: LibreTranslate (if configured) → Google → MyMemory
async function translateText(text: string, source: string, target: string): Promise<string> {
  const src = source && source !== "auto" ? source : "en";
  const errors: string[] = [];

  // 1. Real LibreTranslate instance (only if URL is configured)
  if (getLibreTranslateUrl()) {
    try {
      return await libreTranslate(text, src, target);
    } catch (err) {
      errors.push(`LibreTranslate: ${(err as Error).message}`);
    }
  }

  // 2. Google Translate free
  try {
    return await googleTranslateFree(text, src, target);
  } catch (err) {
    errors.push(`Google: ${(err as Error).message}`);
  }

  // 3. MyMemory
  try {
    return await myMemoryTranslate(text, src, target);
  } catch (err) {
    errors.push(`MyMemory: ${(err as Error).message}`);
  }

  throw new Error(`All translation providers failed: ${errors.join("; ")}`);
}

// Fetch real supported languages from LibreTranslate if configured,
// otherwise return the known fallback list.
async function getLanguages(): Promise<{ code: string; name: string }[]> {
  const baseUrl = getLibreTranslateUrl();
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/languages`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const langs = await res.json();
        if (Array.isArray(langs) && langs.length > 0) {
          return langs.map((l: any) => ({ code: l.code, name: l.name || l.code }));
        }
      }
    } catch {
      // fall through to fallback list
    }
  }
  return SUPPORTED_LANGUAGES;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (url.pathname.endsWith("/languages") || url.pathname.endsWith("/languages/")) {
    const langs = await getLanguages();
    return new Response(JSON.stringify(langs), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (url.pathname.endsWith("/detect")) {
    // Real detection via LibreTranslate if configured
    const baseUrl = getLibreTranslateUrl();
    if (baseUrl && req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.q) {
          const res = await fetch(`${baseUrl}/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: body.q }),
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const detected = await res.json();
            return new Response(JSON.stringify(detected), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch {}
    }
    return new Response(JSON.stringify([{ language: "en", confidence: 1.0 }]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (url.pathname.endsWith("/translate") || req.method === "POST") {
    try {
      const body = await req.json();
      const { q, source, target } = body;

      if (!q || !target) {
        return new Response(JSON.stringify({ error: "Missing q or target" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const src = source || "auto";
      // Handle batch: q can be a single string or an array of strings
      if (Array.isArray(q)) {
        const results: string[] = [];
        for (const text of q) {
          const translated = await translateText(text, src, target);
          results.push(translated);
        }
        return new Response(JSON.stringify({ translatedText: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const translated = await translateText(q, src, target);

      return new Response(JSON.stringify({ translatedText: translated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ status: "ok", service: "libretranslate-proxy" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
