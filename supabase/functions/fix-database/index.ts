import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: Record<string, unknown> = {};

  try {
    // 1. Fix truncated deks (ending with partial word + ".")
    const { data: truncatedDeks, error: tdErr } = await supabase
      .from("articles")
      .select("id, dek")
      .not("dek", "is", null);

    let deksFixed = 0;
    if (tdErr) {
      results.truncatedDeksError = tdErr.message;
    } else if (truncatedDeks) {
      for (const article of truncatedDeks) {
        if (!article.dek) continue;
        let dek = article.dek.trim();
        // Check if dek ends with "." but the last word before "." is incomplete
        // (i.e., the dek was truncated at 170 chars)
        if (dek.endsWith(".") && dek.length >= 150 && dek.length <= 170) {
          // Replace trailing "." with "..."
          dek = dek.slice(0, -1) + "...";
          await supabase.from("articles").update({ dek }).eq("id", article.id);
          deksFixed++;
        }
        // Check if dek doesn't end with proper punctuation
        else if (dek.length > 50 && !dek.endsWith(".") && !dek.endsWith("!") && !dek.endsWith("?") && !dek.endsWith("...") && !dek.endsWith('"') && !dek.endsWith(")") && !dek.endsWith("]")) {
          // Trim back to last complete word and add "..."
          const lastSpace = dek.lastIndexOf(" ");
          if (lastSpace > 0 && lastSpace < dek.length - 1) {
            dek = dek.slice(0, lastSpace) + "...";
          } else {
            dek = dek + "...";
          }
          await supabase.from("articles").update({ dek }).eq("id", article.id);
          deksFixed++;
        }
      }
    }
    results.deksFixed = deksFixed;

    // 2. Remove login/subscription/paywall prompts from summaries and main stories
    const loginPatterns = [
      /You can save this article by registering for free here\.?\s*Or sign-?in if you have an account\.?/gi,
      /sign[- ]?in (if you have|to) an? account/gi,
      /register (for free|here) (to|or) sign/gi,
      /You can save this article[^.]*\./gi,
      /continue reading[^.]*\./gi,
      /subscribe (to|now|for) [^.]*\./gi,
      /This article is (for|available to) subscribers[^.]*\./gi,
      /Already a subscriber\??\s*Log in/gi,
      /Please (log in|sign in) (to|for) [^.]*\./gi,
      /Create a free account[^.]*\./gi,
      /Already registered\??\s*Log in/gi,
      /Newsletter sign[- ]?up[^.]*\./gi,
      /Cookie (notice|policy|preferences)[^.]*\./gi,
      /We use cookies[^.]*\./gi,
      /By (continuing|using|clicking)[^.]*\./gi,
      /Accept (all |optional )?cookies/gi,
      /Manage (your )?cookie (settings|preferences)/gi,
      /This site uses cookies[^.]*\./gi,
      /Advertisement[^.]*\./gi,
      /Related (articles|stories|content)[^.]*\./gi,
      /Also read:[^.]*\./gi,
      /Read more:[^.]*\./gi,
      /Follow us (on|@)[^.]*\./gi,
      /Click here (to|for)[^.]*\./gi,
      /Share this (article|story|post)[^.]*\./gi,
      /Photo (credit|by):[^.]*\./gi,
      /Image (credit|by):[^.]*\./gi,
      /Credit:[^.\n]*\./gi,
      /Courtesy of[^.\n]*\./gi,
      /Screenshot from[^.\n]*\./gi,
      /posted by an? \w+ user[^.\n]*\./gi,
      /Popular on \w+[^.\n]*\./gi,
    ];

    const { data: allArticles, error: aErr } = await supabase
      .from("articles")
      .select("id, dek, story");

    let summariesFixed = 0;
    let storiesFixed = 0;

    if (aErr) {
      results.articlesError = aErr.message;
    } else if (allArticles) {
      for (const article of allArticles) {
        let changed = false;
        const updates: Record<string, unknown> = {};

        // Clean dek
        if (article.dek) {
          let cleanedDek = article.dek;
          for (const pattern of loginPatterns) {
            cleanedDek = cleanedDek.replace(pattern, "");
          }
          cleanedDek = cleanedDek.replace(/\s{2,}/g, " ").trim();
          if (cleanedDek !== article.dek) {
            updates.dek = cleanedDek;
            changed = true;
            summariesFixed++;
          }
        }

        // Clean story JSON
        if (article.story) {
          const story = article.story as Record<string, unknown>;
          let storyChanged = false;
          const fieldsToClean = ["summary", "main_story", "background", "expert_analysis", "why_it_matters", "historical_context", "future_outlook"];

          for (const field of fieldsToClean) {
            if (story[field] && typeof story[field] === "string") {
              let cleaned = story[field] as string;
              for (const pattern of loginPatterns) {
                cleaned = cleaned.replace(pattern, "");
              }
              cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
              if (cleaned !== story[field]) {
                story[field] = cleaned;
                storyChanged = true;
              }
            }
          }

          // Clean array fields
          const arrayFields = ["key_developments", "quick_insights", "reader_takeaways", "timeline"];
          for (const field of arrayFields) {
            if (story[field] && Array.isArray(story[field])) {
              const cleaned = (story[field] as string[]).map((item: string) => {
                let cleanedItem = item;
                for (const pattern of loginPatterns) {
                  cleanedItem = cleanedItem.replace(pattern, "");
                }
                return cleanedItem.replace(/\s{2,}/g, " ").trim();
              }).filter((item: string) => item.length > 0);
              if (JSON.stringify(cleaned) !== JSON.stringify(story[field])) {
                story[field] = cleaned;
                storyChanged = true;
              }
            }
          }

          if (storyChanged) {
            updates.story = story;
            changed = true;
            storiesFixed++;
          }
        }

        if (changed) {
          await supabase.from("articles").update(updates).eq("id", article.id);
        }
      }
    }

    results.summariesFixed = summariesFixed;
    results.storiesFixed = storiesFixed;

    // 3. Fix short main_stories - use dek as main_story if main_story is too short
    const { data: shortStories, error: ssErr } = await supabase
      .from("articles")
      .select("id, dek, story")
      .not("story", "is", null);

    let shortStoriesFixed = 0;
    if (ssErr) {
      results.shortStoriesError = ssErr.message;
    } else if (shortStories) {
      for (const article of shortStories) {
        if (!article.story) continue;
        const story = article.story as Record<string, unknown>;
        const mainStory = story.main_story as string | undefined;
        if (mainStory && mainStory.length < 150 && article.dek && article.dek.length > mainStory.length) {
          story.main_story = article.dek;
          await supabase.from("articles").update({ story }).eq("id", article.id);
          shortStoriesFixed++;
        }
      }
    }
    results.shortStoriesFixed = shortStoriesFixed;

    // 4. Remove special characters from deks (bullet •, etc.)
    const { data: specialCharArticles, error: scErr } = await supabase
      .from("articles")
      .select("id, dek, title, story");

    let specialCharsFixed = 0;
    if (scErr) {
      results.specialCharsError = scErr.message;
    } else if (specialCharArticles) {
      for (const article of specialCharArticles) {
        let changed = false;
        const updates: Record<string, unknown> = {};

        if (article.dek) {
          let cleaned = article.dek.replace(/[•]/g, "");
          cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
          if (cleaned !== article.dek) {
            updates.dek = cleaned;
            changed = true;
          }
        }

        if (article.title) {
          let cleaned = article.title.replace(/[•]/g, "");
          cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
          if (cleaned !== article.title) {
            updates.title = cleaned;
            changed = true;
          }
        }

        if (article.story) {
          const story = article.story as Record<string, unknown>;
          let storyChanged = false;
          const storyStr = JSON.stringify(story);
          if (storyStr.includes("•")) {
            const cleanedStoryStr = storyStr.replace(/[•]/g, "");
            const cleanedStory = JSON.parse(cleanedStoryStr);
            updates.story = cleanedStory;
            storyChanged = true;
          }
          if (storyChanged) {
            changed = true;
          }
        }

        if (changed) {
          await supabase.from("articles").update(updates).eq("id", article.id);
          specialCharsFixed++;
        }
      }
    }
    results.specialCharsFixed = specialCharsFixed;

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
