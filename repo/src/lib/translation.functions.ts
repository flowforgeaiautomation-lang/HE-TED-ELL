import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const supportedLanguages = ["hi", "es", "fr", "de", "ar", "zh", "ja", "ru", "pt"] as const;

const languageNames: Record<(typeof supportedLanguages)[number], string> = {
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ru: "Russian",
  pt: "Portuguese",
};

async function googleTranslate(texts: string[], target: string): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, target, format: "text", source: "en" }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const arr = d?.data?.translations;
    if (!Array.isArray(arr) || arr.length !== texts.length) return null;
    return arr.map((t: { translatedText: string }) => t.translatedText);
  } catch {
    return null;
  }
}

async function deeplTranslate(texts: string[], target: string): Promise<string[] | null> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;
  const map: Record<string, string> = { zh: "ZH", hi: "EN", ar: "EN" }; // DeepL: limited list; skip unsupported
  const upper = (map[target] ?? target.toUpperCase());
  if (["HI", "AR"].includes(upper)) return null;
  try {
    const form = new URLSearchParams();
    for (const t of texts) form.append("text", t);
    form.append("target_lang", upper);
    form.append("source_lang", "EN");
    const r = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const arr = d?.translations;
    if (!Array.isArray(arr) || arr.length !== texts.length) return null;
    return arr.map((t: { text: string }) => t.text);
  } catch {
    return null;
  }
}

async function aiTranslate(texts: string[], target: string): Promise<string[]> {
  const { orChat } = await import("./openrouter.server");
  const content = await orChat({
    json: true,
    temperature: 0.1,
    system: `You are a professional translator. Translate each English string into ${languageNames[target as keyof typeof languageNames] ?? target}. Preserve names, numbers, URLs. Return STRICT JSON: {"translations":[ ... ]} with the same length and order.`,
    prompt: JSON.stringify({ texts }),
  });
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  }
  const arr = Array.isArray((parsed as { translations?: unknown })?.translations)
    ? (parsed as { translations: string[] }).translations
    : Array.isArray(parsed) ? (parsed as string[]) : [];
  return texts.map((t, i) => arr[i] || t);
}

export const translateVisibleText = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      target: z.enum(supportedLanguages),
      texts: z.array(z.string().min(1).max(800)).min(1).max(200),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const unique = [...new Set(data.texts.map((t) => t.trim()).filter(Boolean))];
    let translations =
      (await googleTranslate(unique, data.target)) ??
      (await deeplTranslate(unique, data.target)) ??
      (await aiTranslate(unique, data.target));
    return Object.fromEntries(unique.map((text, i) => [text, translations[i] || text]));
  });
