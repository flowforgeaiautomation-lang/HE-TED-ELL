// Server-only AI client. Prefers Lovable AI Gateway (free, no separate key needed),
// with OpenRouter as an optional fallback when explicit keys are configured.
const LOVABLE_BASE = "https://ai.gateway.lovable.dev/v1";
const OR_BASE = "https://openrouter.ai/api/v1";
const OPENAI_BASE = "https://api.openai.com/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function openRouterKeys() {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.QWEN3_80B_API_KEY,
    process.env.QWEN3_CODER_480B_API_KEY,
  ].filter(Boolean) as string[];
}

async function lovableChat(opts: {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  const res = await fetch(`${LOVABLE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: opts.model ?? "openai/gpt-5.5",
      messages,
      temperature: opts.temperature ?? 0.62,
      max_tokens: 12000,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`LovableAI ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function openAiChat(opts: {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: opts.temperature ?? 0.58,
      max_tokens: 12000,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function geminiChat(opts: {
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const res = await fetch(`${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: opts.system ? { parts: [{ text: opts.system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.58,
        maxOutputTokens: 12000,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") ?? "";
}

export async function orChat(opts: {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  // Primary: Lovable AI Gateway (managed, no external account needed)
  try {
    return await lovableChat(opts);
  } catch (lovableErr) {
    const keys = openRouterKeys();
    if (!keys.length) {
      try {
        return await openAiChat(opts);
      } catch (openAiErr) {
        try {
          return await geminiChat(opts);
        } catch (geminiErr) {
          throw new Error(`${(lovableErr as Error).message}; ${(openAiErr as Error).message}; ${(geminiErr as Error).message}`);
        }
      }
    }
    // Fallback: OpenRouter, only when explicit keys are configured
    const messages = [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: opts.prompt },
    ];
    let lastError = "";
    for (const key of keys) {
      const res = await fetch(`${OR_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://the-united-hell.lovable.app",
          "X-Title": "The United Hell",
        },
        body: JSON.stringify({
          model: opts.model ?? "qwen/qwen3-next-80b-a3b-instruct",
          messages,
          temperature: opts.temperature ?? 0.45,
          max_tokens: 8000,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? "";
      }
      lastError = `OpenRouter ${res.status}: ${await res.text().catch(() => "")}`;
    }
    try {
      return await openAiChat(opts);
    } catch (openAiErr) {
      try {
        return await geminiChat(opts);
      } catch (geminiErr) {
        throw new Error(`${lastError || (lovableErr as Error).message}; ${(openAiErr as Error).message}; ${(geminiErr as Error).message}`);
      }
    }
  }
}

export async function orJson<T = unknown>(opts: {
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
}): Promise<T> {
  const txt = await orChat({ ...opts, json: true });
  return extractJsonFromResponse(txt) as T;
}

function detectTruncation(response: string): boolean {
  const text = response.trim();
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/]/g) || []).length;
  return (
    openBraces !== closeBraces ||
    openBrackets !== closeBrackets ||
    /\.\.\.$|…$|\[truncated\]|\[continued\]/i.test(text)
  );
}

function extractJsonFromResponse(response: string): unknown {
  if (detectTruncation(response)) throw new Error("AI returned truncated JSON");
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const jsonStart = cleaned.search(/[\[{]/);
  if (jsonStart === -1) throw new Error("AI returned non-JSON");
  const closer = cleaned[jsonStart] === "[" ? "]" : "}";
  const jsonEnd = cleaned.lastIndexOf(closer);
  if (jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error("AI returned incomplete JSON");
  cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(
      cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""),
    );
  }
}


export async function pexelsImage(query: string): Promise<string | null> {
  // Try Pexels → Unsplash → Pixabay so categories always get a unique cover.
  const pk = process.env.PEXELS_API_KEY;
  if (pk) {
    try {
      const page = 1 + Math.floor(Math.random() * 10);
      const r = await fetch(
        `https://api.pexels.com/v1/search?per_page=15&page=${page}&query=${encodeURIComponent(query)}`,
        { headers: { Authorization: pk } },
      );
      if (r.ok) {
        const d = await r.json();
        const photos = d?.photos ?? [];
        if (photos.length) {
          const pick = photos[Math.floor(Math.random() * photos.length)];
          const url = pick?.src?.large2x || pick?.src?.large;
          if (url) return url;
        }
      }
    } catch {}
  }
  const uk = process.env.UNSPLASH_ACCESS_KEY;
  if (uk) {
    try {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?per_page=20&query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Client-ID ${uk}` } },
      );
      if (r.ok) {
        const d = await r.json();
        const results = d?.results ?? [];
        if (results.length) {
          const pick = results[Math.floor(Math.random() * results.length)];
          const url = pick?.urls?.regular || pick?.urls?.full;
          if (url) return url;
        }
      }
    } catch {}
  }
  const px = process.env.PIXABAY_API_KEY;
  if (px) {
    try {
      const r = await fetch(
        `https://pixabay.com/api/?key=${px}&q=${encodeURIComponent(query)}&image_type=photo&per_page=30&safesearch=true`,
      );
      if (r.ok) {
        const d = await r.json();
        const hits = d?.hits ?? [];
        if (hits.length) {
          const pick = hits[Math.floor(Math.random() * hits.length)];
          return pick?.largeImageURL || pick?.webformatURL || null;
        }
      }
    } catch {}
  }
  return null;
}
