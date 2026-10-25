// Server-only AI client. Prefers Anthropic (via proxy), then Lovable AI Gateway,
// then OpenRouter/OpenAI/Gemini as optional fallbacks when explicit keys are configured.
import { aiChat as lovableAiChat } from "./ai-gateway.server";

const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const LOVABLE_BASE = "https://ai.gateway.lovable.dev/v1";
const OR_BASE = "https://openrouter.ai/api/v1";
const OPENAI_BASE = "https://api.openai.com/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";

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
  if (!key || key.length < 10) throw new Error("Missing ANTHROPIC_API_KEY");
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
      stream: false,
    }),
  });
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text().catch(() => "")}`);
  }
  if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
    const raw = await res.text();
    if (raw.startsWith("{")) {
      const data = JSON.parse(raw);
      const text = data?.content?.map((c: { type: string; text?: string }) => c.type === "text" ? c.text : "").join("") ?? "";
      return text;
    }
    const lines = raw.split("\n");
    let textParts: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event: error") || line.startsWith("data: ")) {
        const dataPart = line.startsWith("data: ") ? line.slice(6) : "";
        if (dataPart) {
          try {
            const parsed = JSON.parse(dataPart);
            if (parsed?.error?.message) throw new Error(`Anthropic SSE: ${parsed.error.message}`);
            if (parsed?.delta?.text) textParts.push(parsed.delta.text);
            if (parsed?.content?.[0]?.text) textParts.push(parsed.content[0].text);
          } catch (e) {
            if ((e as Error).message.startsWith("Anthropic SSE:")) throw e;
          }
        }
      }
    }
    if (textParts.length) return textParts.join("");
    throw new Error(`Anthropic returned SSE error: ${raw.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.content?.map((c: { type: string; text?: string }) => c.type === "text" ? c.text : "").join("") ?? "";
  return text;
}

function openAiKeys(): string[] {
  return [
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_API_KEY_2,
    process.env.OPENAI_API_KEY_3,
  ].filter(Boolean) as string[];
}

async function openAiChat(opts: {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const keys = openAiKeys();
  if (!keys.length) throw new Error("Missing OPENAI_API_KEY");
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  const models = ["gpt-4o", "gpt-4o-mini", "gpt-4o-mini-2024-07-18"];
  let lastError = "";
  for (const key of keys) {
    for (const model of models) {
      try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.58,
            max_tokens: 12000,
            ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content ?? "";
          if (content) return content;
        }
        lastError = `OpenAI ${res.status}: ${await res.text().catch(() => "")}`;
        // If model not found, try next model; if auth error, try next key
        if (res.status === 404) continue;
        if (res.status === 401 || res.status === 403) break;
      } catch (err) {
        lastError = (err as Error).message;
      }
    }
  }
  throw new Error(lastError || "All OpenAI keys/models failed");
}

async function openAiResponsesChat(opts: {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const keys = [process.env.OPENAI_API_KEY_2, process.env.OPENAI_API_KEY].filter(Boolean) as string[];
  if (!keys.length) throw new Error("Missing OPENAI_API_KEY for responses endpoint");
  const model = opts.model ?? "gpt-6-luna";
  let lastError = "";
  for (const key of keys) {
    try {
      const inputText = opts.system ? `${opts.system}\n\n${opts.prompt}` : opts.prompt;
      const res = await fetch(`${OPENAI_BASE}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          input: inputText,
          store: false,
          ...(opts.json ? { text: { format: { type: "json_object" } } } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const outputText = data?.output?.map((o: { content?: { text?: string }[] }) =>
          o?.content?.map((c: { text?: string }) => c?.text || "").join("")
        ).join("\n") || data?.output_text || "";
        if (outputText) return outputText;
      }
      lastError = `OpenAI Responses ${res.status}: ${await res.text().catch(() => "")}`;
      if (res.status === 401 || res.status === 403) continue;
    } catch (err) {
      lastError = (err as Error).message;
    }
  }
  throw new Error(lastError || "All OpenAI responses keys failed");
}

function geminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

async function geminiChat(opts: {
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("Missing GEMINI_API_KEY");
  const models = ["gemini-2.5-flash"];
  let lastError = "";
  for (const key of keys) {
    for (const model of models) {
      try {
        const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
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
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") ?? "";
          if (text) return text;
        }
        lastError = `Gemini ${res.status}: ${await res.text().catch(() => "")}`;
        if (res.status === 404) continue;
        if (res.status === 401 || res.status === 403) break;
      } catch (err) {
        lastError = (err as Error).message;
      }
    }
  }
  throw new Error(lastError || "All Gemini keys/models failed");
}

const HF_BASE = "https://api-inference.huggingface.co/models";

async function huggingFaceChat(opts: {
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.HUGGINGFACE_APIKEY || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  if (!key || key.length < 10) throw new Error("Missing HUGGINGFACE_APIKEY");
  const model = "meta-llama/Llama-3.3-70B-Instruct";
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  const promptText = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const res = await fetch(`${HF_BASE}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      inputs: promptText,
      parameters: {
        temperature: opts.temperature ?? 0.52,
        max_new_tokens: 8000,
        return_full_text: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (typeof data === "string") return data;
  if (data?.generated_text) return data.generated_text;
  throw new Error("HuggingFace returned unexpected response shape");
}

async function groqChat(opts: {
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.length < 10) throw new Error("Missing GROQ_API_KEY");
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
  let lastError = "";
  for (const model of models) {
    const res = await fetch(GROQ_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.52,
        max_tokens: 16000,
        reasoning_format: "hidden",
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      if (content) return content;
    }
    lastError = `Groq ${res.status}: ${await res.text().catch(() => "")}`;
    if (res.status === 404) continue;
    if (res.status === 401 || res.status === 403) break;
  }
  throw new Error(lastError || "All Groq models failed");
}

// Build provider list at call time so newly-set env vars are picked up.
// Providers are ordered by availability: only providers whose keys exist
// are attempted, and the ones most likely to work come first.
function buildProviderList(): Array<{ name: string; fn: (opts: ChatOpts) => Promise<string> }> {
  const providers: Array<{ name: string; fn: (opts: ChatOpts) => Promise<string> }> = [];
  // Groq first — free tier, all new models confirmed working
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10) {
    providers.push({ name: "Groq", fn: groqChat });
  }
  // OpenAI /v1/responses endpoint — key2 works with gpt-6-luna
  if (process.env.OPENAI_API_KEY_2 && process.env.OPENAI_API_KEY_2.length > 10) {
    providers.push({ name: "OpenAIResponses", fn: openAiResponsesChat });
  }
  // OpenRouter — limited credits, small max_tokens
  const orKeys = openRouterKeys();
  if (orKeys.length) {
    providers.push({ name: "OpenRouter", fn: makeOpenRouterChat(orKeys) });
  }
  // OpenAI chat/completions — both keys out of credits but try as fallback
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10) {
    providers.push({ name: "OpenAI", fn: openAiChat });
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    providers.push({ name: "Gemini", fn: geminiChat });
  }
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10) {
    providers.push({ name: "Anthropic", fn: anthropicChat });
  }
  const hfKey = process.env.HUGGINGFACE_APIKEY || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  if (hfKey && hfKey.length > 10) {
    providers.push({ name: "HuggingFace", fn: huggingFaceChat });
  }
  if (process.env.LOVABLE_API_KEY && process.env.LOVABLE_API_KEY.length > 10) {
    providers.push({ name: "Lovable", fn: lovableChat });
  }
  return providers;
}

type ChatOpts = {
  model?: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
};

function makeOpenRouterChat(keys: string[]): (opts: ChatOpts) => Promise<string> {
  return async (opts: ChatOpts) => {
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
          "HTTP-Referer": "https://theunitedhell.in",
          "X-Title": "The United Hell",
        },
        body: JSON.stringify({
          model: opts.model ?? "qwen/qwen3-next-80b-a3b-instruct",
          messages,
          temperature: opts.temperature ?? 0.45,
          max_tokens: 16000,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? "";
      }
      lastError = `OpenRouter ${res.status}: ${await res.text().catch(() => "")}`;
    }
    throw new Error(lastError || "All OpenRouter keys failed");
  };
}

export async function orChat(opts: ChatOpts): Promise<string> {
  const providers = buildProviderList();
  if (providers.length === 0) {
    throw new Error("No AI provider keys configured. Set OPENAI_API_KEY or GEMINI_API_KEY.");
  }
  const errors: string[] = [];
  for (const { name, fn } of providers) {
    try {
      const result = await fn(opts);
      if (result && result.trim().length > 0) return result;
      errors.push(`${name}: empty response`);
    } catch (err) {
      errors.push(`${name}: ${(err as Error).message}`);
    }
  }
  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
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


const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  politics: [
    "https://images.pexels.com/photos/6130304/pexels-photo-6130304.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3034681/pexels-photo-3034681.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1550337/pexels-photo-1550337.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3253509/pexels-photo-3253509.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/460766/pexels-photo-460766.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/247794/pexels-photo-247794.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/210881/pexels-photo-210881.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/532001/pexels-photo-532001.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3030306/pexels-photo-3030306.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3782216/pexels-photo-3782216.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/518697/pexels-photo-518697.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  technology: [
    "https://images.pexels.com/photos/18108/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3781368/pexels-photo-3781368.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/7988079/pexels-photo-7988079.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1435753/pexels-photo-1435753.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/414676/pexels-photo-414676.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2187170/pexels-photo-2187170.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181297/pexels-photo-1181297.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181356/pexels-photo-1181356.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  science: [
    "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/60022/pexels-photo-60022.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280551/pexels-photo-2280551.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280561/pexels-photo-2280561.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280575/pexels-photo-2280575.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280578/pexels-photo-2280578.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280579/pexels-photo-2280579.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280580/pexels-photo-2280580.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280581/pexels-photo-2280581.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280582/pexels-photo-2280582.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280583/pexels-photo-2280583.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280584/pexels-photo-2280584.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280585/pexels-photo-2280585.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280586/pexels-photo-2280586.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  health: [
    "https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/356040/pexels-photo-356040.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3938022/pexels-photo-3938022.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4021808/pexels-photo-4021808.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4173384/pexels-photo-4173384.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/40572/pexels-photo-40572.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/263354/pexels-photo-263354.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/356020/pexels-photo-356020.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/356019/pexels-photo-356019.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/356018/pexels-photo-356018.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/356017/pexels-photo-356017.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/356016/pexels-photo-356016.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  business: [
    "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184320/pexels-photo-3184320.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184435/pexels-photo-3184435.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184444/pexels-photo-3184444.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184446/pexels-photo-3184446.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184453/pexels-photo-3184453.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184458/pexels-photo-3184458.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  markets: [
    "https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/534215/pexels-photo-534215.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/534219/pexels-photo-534219.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/7788009/pexels-photo-7788009.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371403/pexels-photo-8371403.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371399/pexels-photo-8371399.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371423/pexels-photo-8371423.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371430/pexels-photo-8371430.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371431/pexels-photo-8371431.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371432/pexels-photo-8371432.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371433/pexels-photo-8371433.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371434/pexels-photo-8371434.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371435/pexels-photo-8371435.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  world: [
    "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422462/pexels-photo-2422462.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422360/pexels-photo-2422360.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422244/pexels-photo-2422244.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004662/pexels-photo-1004662.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004663/pexels-photo-1004663.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004664/pexels-photo-1004664.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004666/pexels-photo-1004666.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004667/pexels-photo-1004667.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004668/pexels-photo-1004668.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004669/pexels-photo-1004669.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004670/pexels-photo-1004670.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004671/pexels-photo-1004671.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004672/pexels-photo-1004672.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "artificial-intelligence": [
    "https://images.pexels.com/photos/1034840/pexels-photo-1034840.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/376361/pexels-photo-376361.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1089440/pexels-photo-1089440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438918/pexels-photo-8438918.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438921/pexels-photo-8438921.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438922/pexels-photo-8438922.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438923/pexels-photo-8438923.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438924/pexels-photo-8438924.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438925/pexels-photo-8438925.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438926/pexels-photo-8438926.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438927/pexels-photo-8438927.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438928/pexels-photo-8438928.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438929/pexels-photo-8438929.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  space: [
    "https://images.pexels.com/photos/110854/pexels-photo-110854.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/73910/pexels-photo-73910.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2166927/pexels-photo-2166927.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/41162/pexels-photo-41162.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/73871/pexels-photo-73871.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87651/pexels-photo-87651.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87634/pexels-photo-87634.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87635/pexels-photo-87635.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87636/pexels-photo-87636.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87637/pexels-photo-87637.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87638/pexels-photo-87638.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87639/pexels-photo-87639.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87640/pexels-photo-87640.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87641/pexels-photo-87641.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/87642/pexels-photo-87642.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  climate: [
    "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617459/pexels-photo-3617459.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617460/pexels-photo-3617460.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617461/pexels-photo-3617461.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617462/pexels-photo-3617462.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617463/pexels-photo-3617463.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617465/pexels-photo-3617465.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617466/pexels-photo-3617466.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617467/pexels-photo-3617467.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617468/pexels-photo-3617468.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617469/pexels-photo-3617469.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617470/pexels-photo-3617470.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617471/pexels-photo-3617471.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  environment: [
    "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617459/pexels-photo-3617459.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617460/pexels-photo-3617460.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617461/pexels-photo-3617461.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617462/pexels-photo-3617462.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617463/pexels-photo-3617463.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617465/pexels-photo-3617465.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617466/pexels-photo-3617466.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617467/pexels-photo-3617467.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617468/pexels-photo-3617468.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617469/pexels-photo-3617469.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617470/pexels-photo-3617470.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617471/pexels-photo-3617471.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  music: [
    "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/470982/pexels-photo-470982.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370548/pexels-photo-1370548.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370549/pexels-photo-1370549.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370550/pexels-photo-1370550.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370551/pexels-photo-1370551.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370552/pexels-photo-1370552.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370553/pexels-photo-1370553.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370554/pexels-photo-1370554.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370555/pexels-photo-1370555.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370556/pexels-photo-1370556.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370557/pexels-photo-1370557.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370558/pexels-photo-1370558.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370559/pexels-photo-1370559.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1370560/pexels-photo-1370560.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  movies: [
    "https://images.pexels.com/photos/65168/pexels-photo-65168.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873487/pexels-photo-2873487.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873488/pexels-photo-2873488.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873489/pexels-photo-2873489.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873490/pexels-photo-2873490.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873491/pexels-photo-2873491.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873492/pexels-photo-2873492.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873493/pexels-photo-2873493.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873494/pexels-photo-2873494.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873495/pexels-photo-2873495.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873496/pexels-photo-2873496.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873497/pexels-photo-2873497.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873498/pexels-photo-2873498.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2873499/pexels-photo-2873499.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  gaming: [
    "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290976/pexels-photo-1290976.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290977/pexels-photo-1290977.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290978/pexels-photo-1290978.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290979/pexels-photo-1290979.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290980/pexels-photo-1290980.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290981/pexels-photo-1290981.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290982/pexels-photo-1290982.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290983/pexels-photo-1290983.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290984/pexels-photo-1290984.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290985/pexels-photo-1290985.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290986/pexels-photo-1290986.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290987/pexels-photo-1290987.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290988/pexels-photo-1290988.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1290989/pexels-photo-1290989.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  football: [
    "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1142964/pexels-photo-1142964.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1171084/pexels-photo-1171084.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1450352/pexels-photo-1450352.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597924/pexels-photo-1597924.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597925/pexels-photo-1597925.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597926/pexels-photo-1597926.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597927/pexels-photo-1597927.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597928/pexels-photo-1597928.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597929/pexels-photo-1597929.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597930/pexels-photo-1597930.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597931/pexels-photo-1597931.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597932/pexels-photo-1597932.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  cricket: [
    "https://images.pexels.com/photos/17172382/pexels-photo-17172382.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597924/pexels-photo-1597924.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597925/pexels-photo-1597925.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597926/pexels-photo-1597926.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597927/pexels-photo-1597927.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597928/pexels-photo-1597928.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597929/pexels-photo-1597929.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597930/pexels-photo-1597930.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597931/pexels-photo-1597931.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597932/pexels-photo-1597932.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597933/pexels-photo-1597933.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597934/pexels-photo-1597934.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597935/pexels-photo-1597935.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597936/pexels-photo-1597936.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597937/pexels-photo-1597937.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  sport: [
    "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1142964/pexels-photo-1142964.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1171084/pexels-photo-1171084.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1450352/pexels-photo-1450352.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597924/pexels-photo-1597924.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597925/pexels-photo-1597925.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597926/pexels-photo-1597926.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597927/pexels-photo-1597927.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597928/pexels-photo-1597928.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597929/pexels-photo-1597929.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597930/pexels-photo-1597930.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597931/pexels-photo-1597931.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597932/pexels-photo-1597932.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1597933/pexels-photo-1597933.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  india: [
    "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422462/pexels-photo-2422462.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422360/pexels-photo-2422360.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422244/pexels-photo-2422244.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004662/pexels-photo-1004662.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004663/pexels-photo-1004663.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004664/pexels-photo-1004664.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004666/pexels-photo-1004666.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004667/pexels-photo-1004667.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004668/pexels-photo-1004668.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004669/pexels-photo-1004669.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004670/pexels-photo-1004670.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004671/pexels-photo-1004671.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004672/pexels-photo-1004672.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  economics: [
    "https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/534215/pexels-photo-534215.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/534219/pexels-photo-534219.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/7788009/pexels-photo-7788009.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371403/pexels-photo-8371403.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371399/pexels-photo-8371399.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371423/pexels-photo-8371423.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371430/pexels-photo-8371430.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371431/pexels-photo-8371431.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371432/pexels-photo-8371432.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371433/pexels-photo-8371433.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371434/pexels-photo-8371434.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8371435/pexels-photo-8371435.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "electric-vehicles": [
    "https://images.pexels.com/photos/376361/pexels-photo-376361.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705395/pexels-photo-1705395.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705396/pexels-photo-1705396.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705397/pexels-photo-1705397.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705398/pexels-photo-1705398.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705399/pexels-photo-1705399.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705400/pexels-photo-1705400.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705401/pexels-photo-1705401.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705402/pexels-photo-1705402.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705403/pexels-photo-1705403.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705404/pexels-photo-1705404.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705405/pexels-photo-1705405.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705406/pexels-photo-1705406.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705407/pexels-photo-1705407.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1705408/pexels-photo-1705408.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  physics: [
    "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/60022/pexels-photo-60022.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280551/pexels-photo-2280551.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280561/pexels-photo-2280561.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280575/pexels-photo-2280575.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280578/pexels-photo-2280578.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280579/pexels-photo-2280579.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280580/pexels-photo-2280580.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280581/pexels-photo-2280581.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280582/pexels-photo-2280582.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280583/pexels-photo-2280583.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280584/pexels-photo-2280584.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280585/pexels-photo-2280585.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2280586/pexels-photo-2280586.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  sustainability: [
    "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617459/pexels-photo-3617459.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617460/pexels-photo-3617460.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617461/pexels-photo-3617461.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617462/pexels-photo-3617462.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617463/pexels-photo-3617463.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617465/pexels-photo-3617465.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617466/pexels-photo-3617466.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617467/pexels-photo-3617467.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617468/pexels-photo-3617468.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617469/pexels-photo-3617469.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617470/pexels-photo-3617470.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3617471/pexels-photo-3617471.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  books: [
    "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900763/pexels-photo-1900763.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900764/pexels-photo-1900764.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900765/pexels-photo-1900765.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900766/pexels-photo-1900766.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900767/pexels-photo-1900767.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900768/pexels-photo-1900768.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900769/pexels-photo-1900769.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900770/pexels-photo-1900770.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900771/pexels-photo-1900771.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900772/pexels-photo-1900772.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900773/pexels-photo-1900773.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900774/pexels-photo-1900774.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900775/pexels-photo-1900775.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1900776/pexels-photo-1900776.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  robotics: [
    "https://images.pexels.com/photos/1034840/pexels-photo-1034840.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/376361/pexels-photo-376361.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1089440/pexels-photo-1089440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438918/pexels-photo-8438918.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438921/pexels-photo-8438921.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438922/pexels-photo-8438922.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438923/pexels-photo-8438923.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438924/pexels-photo-8438924.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438925/pexels-photo-8438925.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438926/pexels-photo-8438926.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438927/pexels-photo-8438927.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438928/pexels-photo-8438928.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/8438929/pexels-photo-8438929.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  news: [
    "https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422462/pexels-photo-2422462.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422360/pexels-photo-2422360.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2422244/pexels-photo-2422244.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004662/pexels-photo-1004662.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004663/pexels-photo-1004663.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004664/pexels-photo-1004664.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004666/pexels-photo-1004666.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004667/pexels-photo-1004667.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004668/pexels-photo-1004668.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004669/pexels-photo-1004669.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004670/pexels-photo-1004670.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004671/pexels-photo-1004671.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1004672/pexels-photo-1004672.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
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
  // Try Pexels → Unsplash → Pixabay → Wikimedia Commons → Openverse → NASA
  // so categories always get a unique, relevant cover.
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
  // Wikimedia Commons — public domain and freely licensed images
  const wmResult = await wikimediaCommonsImage(query, exclude);
  if (wmResult) return wmResult;
  // Openverse — openly licensed images
  const ovResult = await openverseImage(query, exclude);
  if (ovResult) return ovResult;
  // NASA — space/science images for relevant categories
  const nasaResult = await nasaImage(query, exclude);
  if (nasaResult) return nasaResult;
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

// Wikimedia Commons — search for freely licensed images relevant to the query.
// Returns a direct image URL suitable for use as a cover image.
async function wikimediaCommonsImage(query: string, exclude: Set<string>): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: `filetype:bitmap|filetype:gif ${query}`,
      gsrnamespace: "6",
      gsrlimit: "20",
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime|size",
      iiurlwidth: "1200",
      origin: "*",
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal: controller.signal,
      headers: { "User-Agent": "TheUnitedHell/1.0 (contact@theunitedhell.in)" },
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const d = await r.json();
    const pages = Object.values(d?.query?.pages ?? {}) as any[];
    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      if (!info) continue;
      const mime: string = info?.mime || "";
      if (!mime.startsWith("image/")) continue;
      const url: string = info?.thumburl || info?.url || "";
      if (!url || exclude.has(url)) continue;
      // Skip SVGs and very small images
      if (mime === "image/svg+xml") continue;
      const width = info?.thumbwidth || info?.width || 0;
      if (width < 400) continue;
      recentlyUsedImages.add(url);
      return url;
    }
  } catch {}
  return null;
}

// Openverse — search for openly licensed images across multiple sources.
async function openverseImage(query: string, exclude: Set<string>): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20&mature=false`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    clearTimeout(timeout);
    if (!r.ok) return null;
    const d = await r.json();
    const results = (d?.results ?? []) as any[];
    for (const img of results) {
      const url: string = img?.url || "";
      if (!url || exclude.has(url)) continue;
      const license: string = (img?.license || "").toLowerCase();
      // Reject non-commercial-only licenses for a monetized site
      if (license.includes("nc") || license === "" || license === "unknown") continue;
      const width = img?.width || 0;
      if (width < 400) continue;
      recentlyUsedImages.add(url);
      return url;
    }
  } catch {}
  return null;
}

// NASA Image and Video Library — search for space, astronomy, and Earth science images.
async function nasaImage(query: string, exclude: Set<string>): Promise<string | null> {
  // Only use NASA for space/science-related queries to avoid irrelevant matches
  const spaceKeywords = ["space", "nasa", "astronaut", "mars", "moon", "satellite", "rocket", "telescope", "galaxy", "planet", "star", "cosmos", "iss", "shuttle", "orbit", "solar", "lunar", "jupiter", "saturn", "neptune", "uranus", "venus", "mercury", "comet", "asteroid", "nebula", "black hole", "earth observation", "climate satellite"];
  const qLower = query.toLowerCase();
  if (!spaceKeywords.some((kw) => qLower.includes(kw))) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(
      `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page=1`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!r.ok) return null;
    const d = await r.json();
    const items = (d?.collection?.items ?? []) as any[];
    for (const item of items.slice(0, 15)) {
      const links = item?.links ?? [];
      const imgLink = links.find((l: any) => l?.rel === "preview" && l?.render === "image");
      const url: string = imgLink?.href || "";
      if (!url || exclude.has(url)) continue;
      recentlyUsedImages.add(url);
      return url;
    }
  } catch {}
  return null;
}

export function getCategoryFallbackImage(category: string, seed?: string, excludeUrls?: Set<string>): string {
  const pool = CATEGORY_FALLBACK_IMAGES[category?.toLowerCase()] || CATEGORY_FALLBACK_IMAGES.world;
  if (!seed) {
    if (excludeUrls) {
      for (const url of pool) if (!excludeUrls.has(url)) return url;
    }
    return pool[0];
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const start = h % pool.length;
  if (excludeUrls) {
    for (let offset = 0; offset < pool.length; offset++) {
      const url = pool[(start + offset) % pool.length];
      if (!excludeUrls.has(url)) return url;
    }
  }
  return pool[start];
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
