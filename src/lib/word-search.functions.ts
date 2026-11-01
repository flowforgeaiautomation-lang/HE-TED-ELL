import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupWord, getPopularWords } from "./dictionary.server";

export const searchWord = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ word: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const result = await lookupWord(data.word);
    if (!result) return { found: false as const, word: data.word };
    return { found: true as const, entry: result };
  });

export const popularWords = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(20).default(8) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    return await getPopularWords(data.limit);
  });
