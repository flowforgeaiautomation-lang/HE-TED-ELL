import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { translateVisibleText, translateArticle, getTranslationHealth, getTranslationStats } from "@/lib/translation.functions";

export const translateText = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      text: z.string().min(1).max(5000),
      source: z.string().default("auto"),
      target: z.string().min(2).max(10),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const result = await translateVisibleText({ data: { target: data.target as any, texts: [data.text] } });
    return { translatedText: result[data.text] || data.text };
  });

export const health = createServerFn({ method: "GET" })
  .handler(async () => {
    return await getTranslationHealth();
  });

export const stats = createServerFn({ method: "GET" })
  .handler(async () => {
    return await getTranslationStats();
  });
