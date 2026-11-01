import { createServerFn } from "@tanstack/react-start";
import { lookupWord } from "@/lib/dictionary.server";

export const dictionaryLookup = createServerFn({ method: "GET" })
  .handler(async (req: any) => {
    const url = new URL(req.request?.url || `http://localhost${req.path || ""}`);
    const word = url.searchParams.get("word") || "";
    if (!word.trim()) return { word: "", meaning: "" };
    const result = await lookupWord(word.trim());
    return result || { word, meaning: "No entry found." };
  });
