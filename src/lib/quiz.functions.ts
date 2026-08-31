import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orJson } from "@/lib/openrouter.server";

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

export type QuizQuestion = {
  id: string;
  question_type: "multiple_choice" | "true_false" | "reflection";
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
};

type QuizQuestionAI = {
  question_type: "multiple_choice" | "true_false" | "reflection";
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
};

async function generateQuizFromArticle(articleId: string): Promise<QuizQuestion[]> {
  const supabase = publicClient();
  const { data: article } = await supabase
    .from("articles")
    .select("title, story")
    .eq("id", articleId)
    .single();
  if (!article) return [];

  const story = (article as any).story || {};
  const articleText = [
    story.summary,
    story.main_story,
    story.background,
    story.expert_analysis,
    story.why_it_matters,
    ...(story.key_developments || []),
    ...(story.quick_insights || []),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 6000);

  if (!articleText || articleText.trim().length < 100) return [];

  const prompt = `You are a quiz generator for a premium news site. Based ONLY on the article below, create 4 quiz questions.

Article title: ${(article as any).title}

Article content:
${articleText}

Rules:
- 2 multiple_choice questions with 4 options each, one correct answer, and a 1-sentence explanation
- 1 true_false question with correct_answer "true" or "false" and an explanation
- 1 reflection question (open-ended, no correct answer, options null, explanation null)
- Questions must be answerable from the article text alone

Return as JSON object: {"questions":[{"question_type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct_answer":"A","explanation":"..."},{"question_type":"true_false","question":"...","options":null,"correct_answer":"true","explanation":"..."},{"question_type":"reflection","question":"...","options":null,"correct_answer":null,"explanation":null}]}`;

  try {
    const result = await orJson<{ questions?: QuizQuestionAI[] } | QuizQuestionAI[]>({
      system: "You are a quiz generator. Return only valid JSON, no other text.",
      prompt,
      temperature: 0.5,
    });
    const questions = Array.isArray(result) ? result : (result?.questions ?? []);
    if (!questions.length) return [];

    const rows = questions.map((q) => ({
      article_id: articleId,
      question_type: q.question_type,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));
    await supabase.from("article_quizzes").insert(rows);

    return questions.map((q, i) => ({
      id: `gen-${articleId}-${i}`,
      question_type: q.question_type,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));
  } catch {
    return [];
  }
}

export const getQuiz = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ articleId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("article_quizzes")
      .select("id, question_type, question, options, correct_answer, explanation")
      .eq("article_id", data.articleId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const existing = (rows ?? []) as QuizQuestion[];
    if (existing.length > 0) return existing;
    return generateQuizFromArticle(data.articleId);
  });

export const saveWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      word: z.string().min(1).max(100),
      meaning: z.string().optional(),
      pronunciation: z.string().optional(),
      partOfSpeech: z.string().optional(),
      example: z.string().optional(),
      synonyms: z.array(z.string()).optional(),
      antonyms: z.array(z.string()).optional(),
      simpleExplanation: z.string().optional(),
      contextInArticle: z.string().optional(),
      wordOrigin: z.string().optional(),
      articleId: z.string().uuid().optional(),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("saved_words").upsert({
      user_id: userId,
      word: data.word,
      meaning: data.meaning,
      pronunciation: data.pronunciation,
      part_of_speech: data.partOfSpeech,
      example: data.example,
      synonyms: data.synonyms,
      antonyms: data.antonyms,
      simple_explanation: data.simpleExplanation,
      context_in_article: data.contextInArticle,
      word_origin: data.wordOrigin,
      article_id: data.articleId,
      difficulty: data.difficulty,
    }, { onConflict: "user_id,word" });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const unsaveWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ word: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("saved_words").delete().eq("user_id", userId).eq("word", data.word);
    return { saved: false };
  });

export const listSavedWords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("saved_words")
      .select("word,meaning,pronunciation,part_of_speech,example,synonyms,antonyms,difficulty,simple_explanation,context_in_article,word_origin,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const checkSavedWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ word: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("saved_words")
      .select("word")
      .eq("user_id", userId)
      .eq("word", data.word)
      .maybeSingle();
    return { saved: !!row };
  });

export const toggleCommentLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ commentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: result, error } = await supabase.rpc("toggle_comment_like", {
      p_comment_id: data.commentId,
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return result as { like_count: number; liked: boolean };
  });
