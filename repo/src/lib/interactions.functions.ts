import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ articleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("article_likes")
      .select("article_id")
      .eq("user_id", userId)
      .eq("article_id", data.articleId)
      .maybeSingle();
    if (existing) {
      await supabase.from("article_likes").delete().eq("user_id", userId).eq("article_id", data.articleId);
      return { liked: false };
    }
    await supabase.from("article_likes").insert({ user_id: userId, article_id: data.articleId });
    return { liked: true };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ articleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("bookmarks")
      .select("article_id")
      .eq("user_id", userId)
      .eq("article_id", data.articleId)
      .maybeSingle();
    if (existing) {
      await supabase.from("bookmarks").delete().eq("user_id", userId).eq("article_id", data.articleId);
      return { bookmarked: false };
    }
    await supabase.from("bookmarks").insert({ user_id: userId, article_id: data.articleId });
    return { bookmarked: true };
  });

export const getMyInteractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ articleIds: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.articleIds.length === 0) return { liked: [], bookmarked: [] };
    const { supabase, userId } = context;
    const [likes, bms] = await Promise.all([
      supabase.from("article_likes").select("article_id").eq("user_id", userId).in("article_id", data.articleIds),
      supabase.from("bookmarks").select("article_id").eq("user_id", userId).in("article_id", data.articleIds),
    ]);
    return {
      liked: (likes.data ?? []).map((r: { article_id: string }) => r.article_id),
      bookmarked: (bms.data ?? []).map((r: { article_id: string }) => r.article_id),
    };
  });

export const listMyBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookmarks")
      .select("created_at, articles(id,slug,title,dek,category,cover_image_url,read_time_minutes,published_at,view_count,like_count,bookmark_count,comment_count,featured_slot,country_code,subcategory)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const items = (data ?? [])
      .map((r: { articles?: unknown }) => r.articles)
      .filter(Boolean) as import("./types").ArticleSummary[];
    return items;
  });

export const postComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        articleId: z.string().uuid(),
        body: z.string().trim().min(1).max(4000),
        promptType: z.enum(["learned", "surprised", "question", "perspective", "reply"]).optional(),
        parentId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("comments")
      .insert({
        article_id: data.articleId,
        user_id: userId,
        parent_id: data.parentId ?? null,
        prompt_type: data.promptType ?? "perspective",
        body: data.body,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const saveInterests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ interests: z.array(z.string().min(1)).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ interests: data.interests, onboarded: true })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(80).optional(),
        username: z.string().trim().min(2).max(40).regex(/^[a-z0-9_]+$/i).optional(),
        bio: z.string().trim().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
