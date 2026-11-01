import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { orChat } from "@/lib/openrouter.server";

/**
 * AI Explain on Selection — uses the existing AI gateway to explain any
 * selected text in the context of the article. Returns plain text.
 */
export const aiExplainText = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      text: z.string().min(1).max(2000),
      context: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const system = `You are a helpful reading assistant for a news platform called "The United Hell". 
Explain the user's selected text clearly and concisely in 2-3 sentences. 
If the text is a word, define it. If it's a phrase or sentence, explain what it means in context.
Do not use markdown. Plain text only.`;
    const prompt = data.context
      ? `Article context: ${data.context.slice(0, 500)}\n\nExplain this text: "${data.text}"`
      : `Explain this text: "${data.text}"`;
    try {
      const result = await orChat({ system, prompt, temperature: 0.3 });
      return { explanation: result.trim() };
    } catch (e) {
      return { explanation: "", error: (e as Error).message };
    }
  });

/**
 * AI Translate on Selection — uses the existing translation infrastructure
 * to translate selected text into a target language.
 */
export const aiTranslateSelection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      text: z.string().min(1).max(2000),
      target: z.string().min(2).max(10),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { translateVisibleText } = await import("./translation.functions");
    // Reuse the existing translateVisibleText server function logic
    const result = await translateVisibleText({ data: { target: data.target as never, texts: [data.text] } });
    const translated = result[data.text] || data.text;
    return { translation: translated };
  });
