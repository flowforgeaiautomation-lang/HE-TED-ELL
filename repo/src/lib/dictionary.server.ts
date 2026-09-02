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

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
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
  const first = simplifyDefinition(def);
  return `In simple terms: ${first.charAt(0).toLowerCase() + first.slice(1)}.`;
}

function makeExample(word: string, partOfSpeech: string, def: string): string {
  const clean = simplifyDefinition(def).toLowerCase();
  const article = /^[aeiou]/i.test(clean) ? "an" : "a";
  if (/verb/i.test(partOfSpeech)) {
    return `Researchers ${word.toLowerCase()} the situation to understand its effects.`;
  }
  if (/adjective/i.test(partOfSpeech)) {
    return `The findings were ${word.toLowerCase()}, surprising many experts.`;
  }
  return `The report described ${article} ${word.toLowerCase()} that shaped the outcome.`;
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
  // AI fallback is optional and only fires when a dictionary API key is absent
  // or the call fails. We avoid generating fake meanings: if no provider is
  // configured, return null so the UI shows the "no entry found" message.
  const key = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!key) return null;
  const endpoint = process.env.AI_API_ENDPOINT || "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 10000);
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      signal: c.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a precise dictionary. Return ONLY JSON with keys: word, partOfSpeech, meaning (one concise real definition), simpleExplanation (plain-language), example (one sentence using the word), synonyms (up to 5), antonyms (up to 5, empty array if none), pronunciation (IPA if known, else empty string). Never invent placeholder meanings. If the word is unknown or ambiguous, return {\"meaning\":\"\"}.",
          },
          { role: "user", content: word },
        ],
      }),
    });
    if (!r.ok) return null;
    const json = await r.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
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
  } finally {
    clearTimeout(t);
  }
}

export async function lookupWords(words: string[]): Promise<VocabEntry[]> {
  const results = await Promise.all(words.map((w) => lookupWord(w)));
  return results.filter((r): r is VocabEntry => r !== null);
}
