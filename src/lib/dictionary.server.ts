import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type VocabEntry = {
  word: string;
  partOfSpeech?: string;
  meaning?: string;
  simpleExplanation?: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  pronunciation?: string;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function publicClient() {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { "user-agent": "TheUnitedHell/1.0" } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function simplifyDefinition(def: string): string {
  return def
    .replace(/^[a-z]+;\s*/i, "")
    .replace(/;[^;]*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[,;]\s*/)[0]
    .trim();
}

function makeSimpleExplanation(def: string): string {
  return simplifyDefinition(def);
}

function makeExample(word: string, partOfSpeech: string, def: string): string | undefined {
  return undefined;
}

async function fetchFromDictionaryApi(word: string): Promise<VocabEntry | null> {
  const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!Array.isArray(data) || !data.length) return null;
  const entry = data[0];
  const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
  if (!meanings.length) return null;
  const first = meanings[0];
  const defs = Array.isArray(first?.definitions) ? first.definitions : [];
  if (!defs.length) return null;
  const def = defs[0]?.definition || "";
  const partOfSpeech = first?.partOfSpeech || "";
  const synonyms = Array.from(new Set(
    [first?.synonyms || [], defs.flatMap((d: any) => d.synonyms || [])].flat().filter(Boolean),
  )).slice(0, 5) as string[];
  const antonyms = Array.from(new Set(
    [first?.antonyms || [], defs.flatMap((d: any) => d.antonyms || [])].flat().filter(Boolean),
  )).slice(0, 5) as string[];
  const pronunciation = entry?.phonetic || entry?.phonetics?.find((p: any) => p.text)?.text;
  const example = defs.find((d: any) => d.example)?.example || makeExample(word, partOfSpeech, def);
  return {
    word,
    partOfSpeech: partOfSpeech || undefined,
    meaning: def || undefined,
    simpleExplanation: makeSimpleExplanation(def),
    example,
    synonyms: synonyms.length ? synonyms : undefined,
    antonyms: antonyms.length ? antonyms : undefined,
    pronunciation: pronunciation || undefined,
  };
}

async function bumpSearchCount(supabase: ReturnType<typeof publicClient>, word: string) {
  await supabase.rpc("increment_vocab_search", { w: word }).then(() => {});
}

export async function lookupWord(word: string): Promise<VocabEntry | null> {
  const key = word.toLowerCase().trim();
  if (!key) return null;
  const supabase = publicClient();
  const { data: cached } = await supabase
    .from("vocabulary_cache")
    .select("*")
    .eq("word", key)
    .maybeSingle();
  if (cached?.meaning) {
    void bumpSearchCount(supabase, key);
    return {
      word: cached.word,
      partOfSpeech: cached.part_of_speech || undefined,
      meaning: cached.meaning || undefined,
      simpleExplanation: cached.simple_explanation || undefined,
      example: cached.example || undefined,
      synonyms: cached.synonyms || undefined,
      antonyms: cached.antonyms || undefined,
      pronunciation: cached.pronunciation || undefined,
    };
  }
  const api = await fetchFromDictionaryApi(key);
  if (api) {
    await supabase.from("vocabulary_cache").upsert({
      word: key,
      part_of_speech: api.partOfSpeech || null,
      meaning: api.meaning || null,
      simple_explanation: api.simpleExplanation || null,
      example: api.example || null,
      synonyms: api.synonyms || null,
      antonyms: api.antonyms || null,
      pronunciation: api.pronunciation || null,
      source: "dictionaryapi.dev",
      search_count: 1,
      last_searched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "word" }).then(() => {});
    return api;
  }
  const ai = await fetchFromAiFallback(key);
  if (ai) {
    await supabase.from("vocabulary_cache").upsert({
      word: key,
      part_of_speech: ai.partOfSpeech || null,
      meaning: ai.meaning || null,
      simple_explanation: ai.simpleExplanation || null,
      example: ai.example || null,
      synonyms: ai.synonyms || null,
      antonyms: ai.antonyms || null,
      pronunciation: ai.pronunciation || null,
      source: "ai-fallback",
      search_count: 1,
      last_searched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "word" }).then(() => {});
    return ai;
  }
  return null;
}

export async function getPopularWords(limit = 8): Promise<string[]> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("vocabulary_cache")
    .select("word")
    .gt("search_count", 0)
    .order("search_count", { ascending: false })
    .order("last_searched_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: { word: string }) => r.word);
}

async function fetchFromAiFallback(word: string): Promise<VocabEntry | null> {
  const providers = getAiProviders();
  if (!providers.length) return null;
  const systemPrompt = "You are a precise dictionary. Return ONLY JSON with keys: word, partOfSpeech, meaning (one concise real dictionary definition — never a generic placeholder like 'an important word used in this story'), simpleExplanation (plain-language), example (one CORRECT, natural English sentence that uses the word with its proper meaning — never a nonsensical or grammatically broken sentence), synonyms (up to 5), antonyms (up to 5, empty array if none), pronunciation (IPA if known, else empty string). Never invent placeholder meanings. Never write example sentences that misuse the word. If the word is unknown or ambiguous, return {\"meaning\":\"\"}.";
  for (const p of providers) {
    const result = await p.chat(word, systemPrompt);
    if (result) return result;
  }
  return null;
}

interface AiProvider {
  name: string;
  chat: (word: string, system: string) => Promise<VocabEntry | null>;
}

function getAiProviders(): AiProvider[] {
  const providers: AiProvider[] = [];

  // 1. OpenAI (if key is set)
  const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (openaiKey) {
    providers.push({
      name: "openai",
      async chat(word: string, system: string) {
        return openAiCompatibleChat(
          "https://api.openai.com/v1/chat/completions",
          openaiKey,
          process.env.AI_MODEL || "gpt-4o-mini",
          word,
          system,
        );
      },
    });
  }

  // 2. Anthropic Claude (if key is set)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    providers.push({
      name: "anthropic",
      async chat(word: string, system: string) {
        return anthropicChat(anthropicKey, word, system);
      },
    });
  }

  // 3. OpenRouter (if key is set)
  const orKey = process.env.OPENROUTER_API_KEY || process.env.QWEN3_80B_API_KEY;
  if (orKey) {
    providers.push({
      name: "openrouter",
      async chat(word: string, system: string) {
        return openAiCompatibleChat(
          "https://openrouter.ai/api/v1/chat/completions",
          orKey,
          "qwen/qwen3-next-80b-a3b-instruct",
          word,
          system,
          { "HTTP-Referer": "https://the-united-hell.lovable.app", "X-Title": "The United Hell" },
        );
      },
    });
  }

  return providers;
}

async function openAiCompatibleChat(
  endpoint: string,
  key: string,
  model: string,
  word: string,
  system: string,
  extraHeaders?: Record<string, string>,
): Promise<VocabEntry | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 10000);
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    };
    if (extraHeaders) Object.assign(headers, extraHeaders);
    const r = await fetch(endpoint, {
      method: "POST",
      signal: c.signal,
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: word },
        ],
      }),
    });
    if (!r.ok) return null;
    const json = await r.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    return parseAiVocabResponse(word, content);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function anthropicChat(key: string, word: string, system: string): Promise<VocabEntry | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 10000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: c.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: system + " Respond with ONLY the JSON object, no markdown, no explanation.",
        messages: [{ role: "user", content: word }],
      }),
    });
    if (!r.ok) return null;
    const json = await r.json();
    const content = json?.content?.[0]?.text;
    if (!content) return null;
    return parseAiVocabResponse(word, content);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function parseAiVocabResponse(word: string, content: string): VocabEntry | null {
  try {
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const jsonStart = cleaned.search(/\{/);
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    if (!parsed?.meaning) return null;
    const clean = <T,>(v: T | undefined): T | undefined =>
      Array.isArray(v) ? (v.filter(Boolean) as T) : v || undefined;
    return {
      word,
      partOfSpeech: clean(parsed.partOfSpeech),
      meaning: clean(parsed.meaning),
      simpleExplanation: clean(parsed.simpleExplanation),
      example: clean(parsed.example),
      synonyms: clean(parsed.synonyms),
      antonyms: clean(parsed.antonyms),
      pronunciation: clean(parsed.pronunciation),
    };
  } catch {
    return null;
  }
}

export async function lookupWords(words: string[]): Promise<VocabEntry[]> {
  const results = await Promise.all(words.map((w) => lookupWord(w)));
  return results.filter((r): r is VocabEntry => r !== null);
}
