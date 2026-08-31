// Server-only AI client. Prefers Anthropic (via proxy), then Lovable AI Gateway,
// then OpenRouter/OpenAI/Gemini as optional fallbacks when explicit keys are configured.
import { aiChat as lovableAiChat } from "./ai-gateway.server";

const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const LOVABLE_BASE = "https://ai.gateway.lovable.dev/v1";
const OR_BASE = "https://openrouter.ai/api/v1";
const OPENAI_BASE = "https://api.openai.com/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function lovableChat(opts: {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  return lovableAiChat(opts);
}

function openRouterKeys() {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.QWEN3_80B_API_KEY,
    process.env.QWEN3_CODER_480B_API_KEY,
  ].filter(Boolean) as string[];
}

async function anthropicChat(opts: {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes("fake")) throw new Error("Missing ANTHROPIC_API_KEY");
  const model = opts.model ?? "claude-haiku-4-5-20251001";
  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 12000,
      temperature: opts.temperature ?? 0.62,
      system: opts.system ?? undefined,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = await res.json();
  const text = data?.content?.map((c: { type: string; text?: string }) => c.type === "text" ? c.text : "").join("") ?? "";
  if (opts.json && text) {
    return text;
  }
  return text;
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
  // Primary: Anthropic (via proxy in Bolt environment, or direct with API key)
  try {
    return await anthropicChat(opts);
  } catch (anthropicErr) {
    // Secondary: Lovable AI Gateway
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
            throw new Error(`${(anthropicErr as Error).message}; ${(lovableErr as Error).message}; ${(openAiErr as Error).message}; ${(geminiErr as Error).message}`);
          }
        }
      }
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


const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  politics: "https://images.pexels.com/photos/6130304/pexels-photo-6130304.jpeg?auto=compress&cs=tinysrgb&w=1200",
  technology: "https://images.pexels.com/photos/18108/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200",
  science: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
  health: "https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1200",
  business: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200",
  markets: "https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1200",
  world: "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "artificial-intelligence": "https://images.pexels.com/photos/1034840/pexels-photo-1034840.jpeg?auto=compress&cs=tinysrgb&w=1200",
  space: "https://images.pexels.com/photos/110854/pexels-photo-110854.jpeg?auto=compress&cs=tinysrgb&w=1200",
  climate: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
  environment: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
  music: "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1200",
  movies: "https://images.pexels.com/photos/65168/pexels-photo-65168.jpeg?auto=compress&cs=tinysrgb&w=1200",
  gaming: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1200",
  football: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1200",
  cricket: "https://images.pexels.com/photos/17172382/pexels-photo-17172382.jpeg?auto=compress&cs=tinysrgb&w=1200",
  sport: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1200",
  india: "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200",
  economics: "https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "electric-vehicles": "https://images.pexels.com/photos/376361/pexels-photo-376361.jpeg?auto=compress&cs=tinysrgb&w=1200",
  physics: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
  sustainability: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
  books: "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1200",
  robotics: "https://images.pexels.com/photos/1034840/pexels-photo-1034840.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

const recentlyUsedImages = new Set<string>();
const MAX_RECENT_IMAGES = 200;

function isImageRelevant(query: string, photo: any): boolean {
  if (!photo) return false;
  const altText = ((photo.alt || "") + " " + (photo.photographer || "")).toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (queryWords.length === 0) return true;
  // If the photo has alt text that shares words with the query, it's relevant
  const matches = queryWords.filter((w) => altText.includes(w)).length;
  if (matches >= 1) return true;
  return !altText.trim();
}

export async function pexelsImage(query: string, options?: { excludeUrls?: Set<string> }): Promise<string | null> {
  const exclude = options?.excludeUrls ?? recentlyUsedImages;
  // Try Pexels → Unsplash → Pixabay so categories always get a unique cover.
  const pk = process.env.PEXELS_API_KEY;
  if (pk) {
    try {
      const page = 1 + Math.floor(Math.random() * 5);
      const r = await fetch(
        `https://api.pexels.com/v1/search?per_page=30&page=${page}&query=${encodeURIComponent(query)}`,
        { headers: { Authorization: pk } },
      );
      if (r.ok) {
        const d = await r.json();
        const photos = (d?.photos ?? []).filter((p: any) => {
          const url = p?.src?.large2x || p?.src?.large;
          return url && !exclude.has(url) && isImageRelevant(query, p);
        });
        if (photos.length) {
          const pick = photos[Math.floor(Math.random() * Math.min(photos.length, 10))];
          const url = pick?.src?.large2x || pick?.src?.large;
          if (url) {
            recentlyUsedImages.add(url);
            if (recentlyUsedImages.size > MAX_RECENT_IMAGES) {
              const first = recentlyUsedImages.values().next().value;
              if (first) recentlyUsedImages.delete(first);
            }
            return url;
          }
        }
      }
    } catch {}
  }
  const uk = process.env.UNSPLASH_ACCESS_KEY;
  if (uk) {
    try {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?per_page=30&query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Client-ID ${uk}` } },
      );
      if (r.ok) {
        const d = await r.json();
        const results = (d?.results ?? []).filter((p: any) => {
          const url = p?.urls?.regular || p?.urls?.full;
          return url && !exclude.has(url);
        });
        if (results.length) {
          const pick = results[Math.floor(Math.random() * Math.min(results.length, 10))];
          const url = pick?.urls?.regular || pick?.urls?.full;
          if (url) {
            recentlyUsedImages.add(url);
            if (recentlyUsedImages.size > MAX_RECENT_IMAGES) {
              const first = recentlyUsedImages.values().next().value;
              if (first) recentlyUsedImages.delete(first);
            }
            return url;
          }
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
        const hits = (d?.hits ?? []).filter((h: any) => {
          const url = h?.largeImageURL || h?.webformatURL;
          return url && !exclude.has(url);
        });
        if (hits.length) {
          const pick = hits[Math.floor(Math.random() * Math.min(hits.length, 10))];
          const url = pick?.largeImageURL || pick?.webformatURL || null;
          if (url) {
            recentlyUsedImages.add(url);
            if (recentlyUsedImages.size > MAX_RECENT_IMAGES) {
              const first = recentlyUsedImages.values().next().value;
              if (first) recentlyUsedImages.delete(first);
            }
            return url;
          }
        }
      }
    } catch {}
  }
  return null;
}

export function getCategoryFallbackImage(category: string): string {
  return CATEGORY_FALLBACK_IMAGES[category?.toLowerCase()] || CATEGORY_FALLBACK_IMAGES.world;
}

export async function pexelsVideo(query: string): Promise<{ videoUrl: string; posterUrl: string } | null> {
  const pk = process.env.PEXELS_API_KEY;
  if (!pk) {
    return getCategoryFallbackVideo(query);
  }
  try {
    const page = 1 + Math.floor(Math.random() * 3);
    const r = await fetch(
      `https://api.pexels.com/videos/search?per_page=15&page=${page}&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: pk } },
    );
    if (!r.ok) return getCategoryFallbackVideo(query);
    const d = await r.json();
    const videos = (d?.videos ?? []).filter((v: any) => {
      const files = v?.video_files ?? [];
      return files.some((f: any) => f?.file_type === "video/mp4" && f?.width >= 640);
    });
    if (!videos.length) return getCategoryFallbackVideo(query);
    const pick = videos[Math.floor(Math.random() * Math.min(videos.length, 5))];
    const mp4 = (pick?.video_files ?? [])
      .filter((f: any) => f?.file_type === "video/mp4")
      .sort((a: any, b: any) => (b?.width ?? 0) - (a?.width ?? 0))[0];
    if (!mp4?.link) return getCategoryFallbackVideo(query);
    const poster = pick?.image ?? "";
    return { videoUrl: mp4.link, posterUrl: poster };
  } catch {
    return getCategoryFallbackVideo(query);
  }
}

const CATEGORY_FALLBACK_VIDEOS: Record<string, { videoUrl: string; posterUrl: string }> = {
  world: { videoUrl: "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  politics: { videoUrl: "https://videos.pexels.com/video-files/4765242/4765242-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/6130304/pexels-photo-6130304.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  technology: { videoUrl: "https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/18108/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200" },
  science: { videoUrl: "https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  health: { videoUrl: "https://videos.pexels.com/video-files/4211718/4211718-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  business: { videoUrl: "https://videos.pexels.com/video-files/3195874/3195874-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  markets: { videoUrl: "https://videos.pexels.com/video-files/3195874/3195874-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  "artificial-intelligence": { videoUrl: "https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/1034840/pexels-photo-1034840.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  space: { videoUrl: "https://videos.pexels.com/video-files/1869990/1869990-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/110854/pexels-photo-110854.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  climate: { videoUrl: "https://videos.pexels.com/video-files/1405922/1405922-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  environment: { videoUrl: "https://videos.pexels.com/video-files/1405922/1405922-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  music: { videoUrl: "https://videos.pexels.com/video-files/2765448/2765448-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  movies: { videoUrl: "https://videos.pexels.com/video-files/2765448/2765448-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/65168/pexels-photo-65168.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  gaming: { videoUrl: "https://videos.pexels.com/video-files/2699157/2699157-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  football: { videoUrl: "https://videos.pexels.com/video-files/4765242/4765242-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-ball-46798.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  cricket: { videoUrl: "https://videos.pexels.com/video-files/4765242/4765242-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/17172382/pexels-photo-17172382.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  sport: { videoUrl: "https://videos.pexels.com/video-files/4765242/4765242-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-ball-46798.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  india: { videoUrl: "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  economics: { videoUrl: "https://videos.pexels.com/video-files/3195874/3195874-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  "electric-vehicles": { videoUrl: "https://videos.pexels.com/video-files/1709115/1709115-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/376361/pexels-photo-376361.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  physics: { videoUrl: "https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  sustainability: { videoUrl: "https://videos.pexels.com/video-files/1405922/1405922-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  books: { videoUrl: "https://videos.pexels.com/video-files/2765448/2765448-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  robotics: { videoUrl: "https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/1034840/pexels-photo-1034840.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  news: { videoUrl: "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4", posterUrl: "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200" },
};

export function getCategoryFallbackVideo(query: string): { videoUrl: string; posterUrl: string } | null {
  const q = query.toLowerCase();
  for (const [cat, vid] of Object.entries(CATEGORY_FALLBACK_VIDEOS)) {
    if (q.includes(cat)) return vid;
  }
  return CATEGORY_FALLBACK_VIDEOS.news;
}
