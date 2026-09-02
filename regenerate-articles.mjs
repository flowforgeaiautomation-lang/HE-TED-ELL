#!/usr/bin/env node
/**
 * Regenerate ALL articles in the database through the AI pipeline.
 * Reads each article's source URL and source text, extracts facts,
 * calls the AI API, validates originality, and updates the database.
 *
 * Usage: node regenerate-articles.mjs [--limit N] [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

// --- Config ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const AI_MODEL = "claude-haiku-4-5-20251001";
const CONCURRENCY = 3;
const MAX_RETRIES = 3;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Helpers ---
function wordCount(s = "") {
  return (s.trim().match(/\S+/g) || []).length;
}

function normalizeText(s = "") {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function splitSentences(s = "") {
  return s.split(/[.!?]+/).map(x => x.trim()).filter(x => wordCount(x) >= 3);
}

function similarity(a, b) {
  const aw = normalizeText(a).split(" ").filter(w => w.length > 2);
  const bw = normalizeText(b).split(" ").filter(w => w.length > 2);
  if (!aw.length || !bw.length) return 0;
  const bs = new Set(bw);
  let shared = 0;
  for (const w of aw) if (bs.has(w)) shared++;
  return (2 * shared) / (aw.length + bw.length);
}

function hasCopiedPhrase(output, source) {
  const outWords = normalizeText(output).split(" ").filter(w => w.length > 2);
  const sourceNorm = ` ${normalizeText(source)} `;
  for (let i = 0; i <= outWords.length - 10; i++) {
    const phrase = outWords.slice(i, i + 10).join(" ");
    if (sourceNorm.includes(` ${phrase} `)) return true;
  }
  return false;
}

function hasCopiedSentence(output, source) {
  const sourceSentences = splitSentences(source);
  const outputSentences = splitSentences(output);
  for (const outSent of outputSentences) {
    for (const srcSent of sourceSentences) {
      if (similarity(outSent, srcSent) >= 0.55) return true;
    }
  }
  return false;
}

function hasCopiedHeadline(headline, sourceHeadline) {
  if (!headline || !sourceHeadline) return false;
  return similarity(headline, sourceHeadline) >= 0.60;
}

function hasCopiedParagraphStructure(output, source) {
  const sourceParas = source.split(/\n{2,}/).map(p => p.trim()).filter(p => wordCount(p) >= 20);
  const outputParas = output.split(/\n{2,}/).map(p => p.trim()).filter(p => wordCount(p) >= 20);
  if (sourceParas.length < 3 || outputParas.length < 3) return false;
  let consecutiveHits = 0;
  let maxConsecutive = 0;
  let srcIdx = 0;
  for (const outPara of outputParas) {
    let found = false;
    for (let s = srcIdx; s < Math.min(srcIdx + 3, sourceParas.length); s++) {
      if (similarity(outPara, sourceParas[s]) >= 0.35) {
        found = true;
        srcIdx = s + 1;
        break;
      }
    }
    if (found) {
      consecutiveHits++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveHits);
    } else {
      consecutiveHits = 0;
    }
  }
  return maxConsecutive >= 3;
}

function qualityPass(article, sourceBody, sourceTitle) {
  const story = article.story;
  const combined = `${article.title}\n${article.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}`;
  if (wordCount(story.main_story) < 250) return false;
  if (wordCount(story.summary) < 20) return false;
  if ((story.vocabulary || []).length < 4) return false;
  const articleTextForVocabCheck = `${story.main_story || ""} ${story.summary || ""} ${story.background || ""}`;
  const filteredVocab = filterVocabulary(story.vocabulary || [], articleTextForVocabCheck);
  if (filteredVocab.length < 4) return false;
  for (const v of filteredVocab) {
    if (isGenericVocabEntry(v)) return false;
  }
  if (hasCopiedPhrase(combined, sourceBody)) return false;
  if (hasCopiedSentence(story.main_story, sourceBody)) return false;
  if (hasCopiedParagraphStructure(story.main_story, sourceBody)) return false;
  if (sourceTitle && hasCopiedHeadline(article.title || "", sourceTitle)) return false;
  const paragraphs = story.main_story.split(/\n{2,}/).filter(p => wordCount(p) >= 30);
  if (paragraphs.length < 3) return false;
  const seen = new Set();
  for (const paragraph of paragraphs) {
    const key = normalizeText(paragraph).slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) return false;
  return true;
}

function scoreArticle(article, sourceBody, sourceTitle) {
  let score = 100;
  const story = article.story;
  const combined = `${article.title}\n${article.dek}\n${story.summary}\n${story.main_story}\n${story.background || ""}`;
  if (wordCount(story.main_story) < 250) score -= 15;
  if ((story.vocabulary || []).length < 4) score -= 10;
  const articleTextForVocabScore = `${story.main_story || ""} ${story.summary || ""} ${story.background || ""}`;
  const filteredVocabScore = filterVocabulary(story.vocabulary || [], articleTextForVocabScore);
  if (filteredVocabScore.length < 4) score -= 15;
  for (const v of filteredVocabScore) {
    if (isGenericVocabEntry(v)) score -= 10;
  }
  if (hasCopiedPhrase(combined, sourceBody)) score -= 15;
  if (hasCopiedSentence(story.main_story, sourceBody)) score -= 20;
  if (hasCopiedParagraphStructure(story.main_story, sourceBody)) score -= 20;
  if (sourceTitle && hasCopiedHeadline(article.title || "", sourceTitle)) score -= 15;
  const paragraphs = story.main_story.split(/\n{2,}/).filter(p => wordCount(p) >= 30);
  if (paragraphs.length < 3) score -= 10;
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function describeQualityFailures(article, sourceBody, sourceTitle) {
  const failures = [];
  const story = article.story;
  if (wordCount(story.main_story) < 250) failures.push("main story too short");
  if ((story.vocabulary || []).length < 4) failures.push("missing vocabulary");
  const articleTextForVocabDesc = `${story.main_story || ""} ${story.summary || ""} ${story.background || ""}`;
  const filteredVocabDesc = filterVocabulary(story.vocabulary || [], articleTextForVocabDesc);
  if (filteredVocabDesc.length < 4) failures.push("vocabulary words not found in article");
  let hasGenericVocab = false;
  for (const v of filteredVocabDesc) {
    if (isGenericVocabEntry(v)) hasGenericVocab = true;
  }
  if (hasGenericVocab) failures.push("generic placeholder vocabulary definitions");
  if (hasCopiedPhrase(`${article.title}\n${article.dek}\n${story.main_story}`, sourceBody)) failures.push("copied source phrasing");
  if (hasCopiedSentence(story.main_story, sourceBody)) failures.push("copied sentence structure from source");
  if (hasCopiedParagraphStructure(story.main_story, sourceBody)) failures.push("paragraph structure follows source order");
  if (sourceTitle && hasCopiedHeadline(article.title || "", sourceTitle)) failures.push("headline too similar to source");
  const paragraphs = story.main_story.split(/\n{2,}/).filter(p => wordCount(p) >= 30);
  if (paragraphs.length < 3) failures.push("not enough paragraphs");
  const summaryNorm = normalizeText(story.summary).slice(0, 80);
  if (summaryNorm && normalizeText(story.main_story).includes(summaryNorm)) failures.push("summary repeated in main story");
  return failures.length ? failures : ["unknown quality issue"];
}

// --- AI Call ---
async function aiGenerate(system, prompt, temperature = 0.62, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          max_tokens: 12000,
          temperature,
          stream: false,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Anthropic ${res.status}: ${txt}`);
      }
      const ct = res.headers.get("content-type") || "";
      let text;
      if (ct.includes("text/event-stream") || ct.includes("text/plain")) {
        // Parse SSE stream
        const raw = await res.text();
        const lines = raw.split("\n");
        let content = "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "content_block_delta" && evt.delta?.text) {
                content += evt.delta.text;
              }
            } catch {}
          }
        }
        text = content;
      } else {
        const data = await res.json();
        text = data?.content?.map(c => c.type === "text" ? c.text : "").join("") ?? "";
      }
      if (!text) throw new Error("AI returned empty response");
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

async function aiJson(system, prompt, temperature = 0.62) {
  const text = await aiGenerate(system, prompt, temperature);
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI returned non-JSON output");
  }
}

// --- Text cleaning ---
function cleanEditorialText(text) {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  cleaned = cleaned.replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/gi, "");
  cleaned = cleaned.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "");
  cleaned = cleaned.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  cleaned = cleaned.replace(/<\/?(?:div|span|section|article|header|footer|nav|aside|figure|figcaption|picture|source)\b[^>]*>/gi, "");
  cleaned = cleaned.replace(/<img\b[^>]*>/gi, "");
  cleaned = cleaned.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  cleaned = cleaned.replace(/<(p|blockquote|li|ul|ol|h[1-6])\b[^>]*>/gi, "\n\n");
  cleaned = cleaned.replace(/<\/(p|blockquote|li|ul|ol|h[1-6])>/gi, "\n");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  cleaned = cleaned.replace(/&nbsp;/g, " ");
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&lt;/g, "<");
  cleaned = cleaned.replace(/&gt;/g, ">");
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&apos;/g, "'");
  cleaned = cleaned.replace(/&hellip;/g, "...");
  cleaned = cleaned.replace(/&mdash;/g, "—");
  cleaned = cleaned.replace(/&ndash;/g, "–");
  cleaned = cleaned.replace(/&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/gi, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.trim();
  return cleaned;
}

function truncateAtWordBoundary(text, maxLen) {
  if (!text || text.length <= maxLen) return text || "";
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > maxLen * 0.7 ? lastSpace : maxLen).trim() + "...";
}

function cleanTitleBoundary(text) {
  if (!text) return "";
  let t = text.trim();
  t = t.replace(/^["'"]+|["'"]+$/g, "");
  t = t.replace(/\s+/g, " ");
  return t;
}

function cleanListValues(vals) {
  if (!Array.isArray(vals)) return [];
  return vals.map(v => typeof v === "string" ? cleanEditorialText(v) : String(v ?? ""))
    .map(v => v.trim())
    .filter(v => v.length > 10);
}

function cleanDistinctList(items, existing, maxLen) {
  const seen = new Set(existing.map(s => normalizeText(s).slice(0, 80)));
  const result = [];
  for (const item of items) {
    const key = normalizeText(item).slice(0, 80);
    if (!seen.has(key) && wordCount(item) >= 3) {
      seen.add(key);
      result.push(item);
    }
    if (result.length >= maxLen) break;
  }
  return result;
}

function cleanInsightValues(vals) {
  if (!Array.isArray(vals)) return [];
  return vals.map(v => {
    if (typeof v !== "string") return "";
    let cleaned = v.replace(/^(Quick Insight|Insight|Key Insight|Takeaway|Point|Fact)\s*[:：-]\s*/i, "");
    return cleanEditorialText(cleaned);
  }).filter(v => v.length > 10);
}

const GENERIC_VOCAB_MEANINGS = /^(an?\s+)?(important|key|significant|useful|technical|specialized|complex|difficult|unfamiliar)\s+(word|term)\s+(used|in|appearing|found|mentioned|that\s+may\s+be)\s+(in|this|the)\s+(article|story|context|text|piece|report)/i;
const GENERIC_VOCAB_MEANINGS_2 = /^(a\s+)?term\s+used\s+in\s+this\s+(article|story)/i;
const GENERIC_VOCAB_MEANINGS_3 = /^(an?\s+)?(word|term)\s+(that\s+)?(may\s+be|is)\s+(unfamiliar|new|uncommon|difficult)/i;

function isGenericVocabEntry(entry) {
  const meaning = (entry?.meaning || "").trim();
  if (!meaning || meaning.length < 5) return true;
  if (GENERIC_VOCAB_MEANINGS.test(meaning)) return true;
  if (GENERIC_VOCAB_MEANINGS_2.test(meaning)) return true;
  if (GENERIC_VOCAB_MEANINGS_3.test(meaning)) return true;
  const word = (entry?.word || "").trim().toLowerCase();
  if (!word) return true;
  const example = (entry?.example || "").trim();
  if (example && normalizeText(example).includes(normalizeText(word))) {
    if (wordCount(example) > 15 && similarity(example, entry?.contextInArticle || "") > 0.8) return true;
  }
  return false;
}

function filterVocabulary(vocab, articleText) {
  if (!Array.isArray(vocab)) return [];
  const articleLower = (articleText || "").toLowerCase();
  const seen = new Set();
  const result = [];
  for (const entry of vocab) {
    if (!entry || !entry.word) continue;
    const word = String(entry.word).trim().toLowerCase();
    if (!word || word.length < 3) continue;
    if (seen.has(word)) continue;
    if (isGenericVocabEntry(entry)) continue;
    if (!articleLower.includes(word)) continue;
    seen.add(word);
    result.push({
      word: entry.word,
      meaning: entry.meaning,
      example: entry.example || "",
      contextInArticle: entry.contextInArticle || "",
      ipa: entry.ipa || entry.phonetic || "",
      origin: entry.origin || "",
      part_of_speech: entry.part_of_speech || "",
      synonyms: Array.isArray(entry.synonyms) ? entry.synonyms : [],
      antonyms: Array.isArray(entry.antonyms) ? entry.antonyms : [],
    });
  }
  return result;
}

// --- Allowed categories ---
const ALLOWED_SLUGS = [
  "world", "politics", "business", "technology", "science", "health",
  "sport", "culture", "environment", "discovery", "lifestyle", "education"
];

const SYSTEM_PROMPT = `You are the permanent editorial engine for "The United Hell" — a premium global newspaper. Your only job is to produce finished, publication-ready news articles. You are not a chatbot, assistant, blogger, FAQ writer, or summariser. You write like a senior correspondent at Reuters, the BBC, The Economist, or the Associated Press.

Rules:
- Use the supplied material ONLY as factual research. Write an independently structured article.
- Do NOT copy any source sentence. Do NOT reproduce any source paragraph.
- Do NOT translate source text. Do NOT perform sentence-by-sentence paraphrasing.
- Do NOT preserve the source article's paragraph order or headline structure.
- Independently synthesize the verified facts and explain them clearly in original language.
- The main_story MUST be 6-10 distinct paragraphs and at least 450 words of flowing prose.
- The FIRST paragraph must NOT restate the summary — open with a new angle.
- Each subsequent paragraph covers a DIFFERENT angle.
- Do NOT label paragraphs with "What happened" / "Why it matters" etc.
- Do not mention the outlet, publication, or platform name inside story sections.
- Key Developments and Quick Insights must not repeat each other or the main story.
- Every paragraph must add NEW information. Never repeat the headline or summary inside paragraphs.
- Do not copy any 10+ word phrase from the source — rewrite everything in original newsroom prose.
- For organizations and people, EXPLAIN who/what they are.
- Vocabulary: pick 5-10 words that ACTUALLY APPEAR in the article. Each MUST have an EXACT dictionary definition, a CORRECT natural example sentence (NOT from the article), the EXACT sentence from the article as contextInArticle, proper IPA pronunciation, and word origin if known.
- Never write "an important word used in this story". Never write nonsensical example sentences.

Return a JSON object with this exact structure:
{
  "title": "Original headline (string)",
  "dek": "Summary, 2-3 sentences (string)",
  "category": "One of: ${ALLOWED_SLUGS.join(", ")}",
  "story": {
    "summary": "2-3 sentence summary (string)",
    "main_story": "6-10 paragraphs of flowing prose, separated by \\n\\n (string)",
    "background": "Background context (string, optional)",
    "what_happened": "What happened - explain the actual event (string, optional)",
    "why_it_matters": "Why it matters - explain significance with facts (string, optional)",
    "how_it_happened": "How it happened - explain the sequence/process (string, optional)",
    "who_and_where": "Who & where - identify people, organizations and locations (string, optional)",
    "what_came_before": "What came before - relevant background (string, optional)",
    "key_developments": ["5 key developments (string array)"],
    "quick_insights": ["6 quick insights (string array)"],
    "key_facts": ["Key facts - important factual data like dates, numbers, locations (string array, optional)"],
    "expert_analysis": "Expert analysis (string, optional)",
    "key_numbers": [{"value": "number", "context": "what it means"}],
    "people": [{"name": "Name", "role": "Who they are", "why_in_story": "Why they matter"}],
    "organizations": [{"name": "Org name", "what_it_is": "What the org does", "role_in_story": "Their role"}],
    "countries": [{"name": "Country", "role": "Its role in the story"}],
    "did_you_know": "Interesting fact (string, optional)",
    "historical_context": "Historical context (string, optional)",
    "future_outlook": "Future outlook (string, optional)",
    "reader_takeaways": ["3-5 takeaways (string array)"],
    "timeline": ["Timeline events (string array, optional)"],
    "what_happens_next": "What happens next (string, optional)",
    "vocabulary": [{"word": "word", "meaning": "exact dictionary definition", "example": "natural example sentence NOT from the article", "contextInArticle": "exact sentence from the article containing this word", "ipa": "IPA pronunciation", "origin": "word origin if known"}]
  }
}`;

// --- Main regeneration logic ---
async function regenerateArticle(article) {
  const sourceUrl = article.source_url || (article.story?.sources?.[0]?.url) || "";
  const sourceName = article.story?.sources?.[0]?.name || article.source_name || "";
  
  // Get the source text from the article's existing content for fact extraction
  const existingStory = article.story || {};
  const existingMainStory = existingStory.main_story || "";
  const existingSummary = existingStory.summary || article.dek || "";
  const existingDek = article.dek || existingSummary;
  
  // We need source text to compare against. Since we don't have the original raw source,
  // we'll use the existing article as the "source" for originality comparison,
  // but we'll extract facts from it to generate a completely new version.
  const sourceBody = existingMainStory;
  const sourceTitle = article.title;
  
  if (wordCount(sourceBody) < 80) {
    return { success: false, reason: "insufficient source text" };
  }
  
  // Extract facts from the existing article
  const factExtractionPrompt = `Extract key facts from this news article. List only verified facts - who, what, when, where, key numbers, official statements, and context. Do NOT include any narrative text, just the facts.

Article title: ${article.title}
Article content:
${sourceBody}

Return a structured list of facts.`;

  let facts;
  try {
    facts = await aiGenerate(
      "You are a fact extractor. Extract only verified facts from news articles. Be precise and concise.",
      factExtractionPrompt,
      0.3
    );
  } catch (err) {
    return { success: false, reason: `fact extraction failed: ${err.message}` };
  }
  
  // Generate new article from facts
  const generatePrompt = `Allowed category slugs (pick the single best match): ${ALLOWED_SLUGS.join(", ")}

FACTUAL RESEARCH NOTES (use ONLY these facts — never invent people, numbers, quotes, dates, or events that are not in this text):
${facts}

IMPORTANT: The text above is RESEARCH NOTES, NOT text to rewrite. Use the supplied material only as factual research. Write an independently structured article for The United Hell. Do not reproduce source sentences, paragraphs, headline wording, or the source article's sequence. Do not perform sentence-by-sentence paraphrasing. Independently synthesize the verified facts and explain them clearly in original language.

First build an internal fact sheet from the research notes. FORGET the original wording — do not look at it again. Then write a completely new premium news article from the fact sheet in your own original editorial voice.

The main_story MUST be 6-10 distinct paragraphs and at least 450 words of flowing prose. The FIRST paragraph must NOT restate the summary — open with a new angle (context, a key detail, or the human stakes). Each subsequent paragraph covers a DIFFERENT angle: the core event, who is involved (EXPLAIN what each organisation/person/place IS — never just name-drop), where it happened and WHY that place matters, why it happened, background, reactions, impact.

Do NOT label paragraphs with "What happened" / "Why it matters" / "Why should I care" / "What can we learn". Do not mention the outlet, publication, or platform name inside story sections. Key Developments and Quick Insights must not repeat each other or the main story. Every paragraph must add NEW information. Never repeat the headline or summary inside paragraphs.

Fill in what_happened, why_it_matters, how_it_happened, who_and_where, what_came_before, key_numbers, key_facts, people, organizations, countries, did_you_know, historical_context, future_outlook, and reader_takeaways from verified facts. Omit any section the facts do not support. For organizations and people, EXPLAIN who/what they are.

Vocabulary: pick 5-10 words that ACTUALLY APPEAR in the article. Each MUST have an EXACT dictionary definition, a CORRECT natural example sentence (NOT from the article), the EXACT sentence from the article as contextInArticle, proper IPA pronunciation, and word origin if known. Never write "an important word used in this story". Never write nonsensical example sentences.

Return a JSON object with this exact structure:
{
  "title": "Original headline",
  "dek": "Summary, 2-3 sentences",
  "category": "${article.category || ALLOWED_SLUGS.join(" or ")}",
  "story": {
    "summary": "2-3 sentence summary",
    "main_story": "6-10 paragraphs of flowing prose separated by \\n\\n",
    "background": "Background context (optional)",
    "what_happened": "What happened - explain the actual event (optional)",
    "why_it_matters": "Why it matters - explain significance with facts (optional)",
    "how_it_happened": "How it happened - explain the sequence/process (optional)",
    "who_and_where": "Who & where - identify people, organizations and locations (optional)",
    "what_came_before": "What came before - relevant background (optional)",
    "key_developments": ["5 key developments"],
    "quick_insights": ["6 quick insights"],
    "key_facts": ["Key facts - important factual data (optional)"],
    "expert_analysis": "Expert analysis (optional)",
    "key_numbers": [{"value": "number", "context": "what it means"}],
    "people": [{"name": "Name", "role": "Who they are", "why_in_story": "Why they matter"}],
    "organizations": [{"name": "Org name", "what_it_is": "What the org does", "role_in_story": "Their role"}],
    "countries": [{"name": "Country", "role": "Its role in the story"}],
    "did_you_know": "Interesting fact (optional)",
    "historical_context": "Historical context (optional)",
    "future_outlook": "Future outlook (optional)",
    "reader_takeaways": ["3-5 takeaways"],
    "timeline": ["Timeline events (optional)"],
    "what_happens_next": "What happens next (optional)",
    "vocabulary": [{"word": "word", "meaning": "exact dictionary definition", "example": "natural example sentence NOT from the article", "contextInArticle": "exact sentence from the article containing this word", "ipa": "IPA pronunciation", "origin": "word origin if known"}]
  }
}`;

  let out;
  try {
    out = await aiJson(SYSTEM_PROMPT, generatePrompt, 0.72);
  } catch (err) {
    return { success: false, reason: `AI generation failed: ${err.message}` };
  }
  
  if (!out?.title) return { success: false, reason: "AI returned no title" };
  
  // Sanitize
  const story = out.story || {};
  const keyDevelopments = cleanDistinctList(cleanListValues(story.key_developments), [], 5);
  const quickInsights = cleanDistinctList(cleanInsightValues(story.quick_insights), keyDevelopments, 6);
  const articleTextForVocab = `${cleanEditorialText(story.main_story || "")} ${cleanEditorialText(story.summary || "")} ${cleanEditorialText(story.background || "")}`;
  const vocabulary = filterVocabulary(story.vocabulary || [], articleTextForVocab).slice(0, 8);
  
  const cleaned = {
    ...out,
    title: cleanTitleBoundary(cleanEditorialText(out.title) || article.title),
    dek: truncateAtWordBoundary(cleanEditorialText(out.dek) || article.dek || "", 300),
    category: ALLOWED_SLUGS.includes(out.category) ? out.category : (article.category || "discovery"),
    story: {
      ...story,
      summary: cleanEditorialText(story.summary) || "",
      main_story: cleanEditorialText(story.main_story) || "",
      background: cleanEditorialText(story.background) || undefined,
      what_happened: cleanEditorialText(story.what_happened) || undefined,
      why_it_matters: cleanEditorialText(story.why_it_matters) || undefined,
      how_it_happened: cleanEditorialText(story.how_it_happened) || undefined,
      who_and_where: cleanEditorialText(story.who_and_where) || undefined,
      what_came_before: cleanEditorialText(story.what_came_before) || undefined,
      key_developments: keyDevelopments,
      quick_insights: quickInsights,
      key_facts: cleanListValues(story.key_facts).length ? cleanListValues(story.key_facts) : undefined,
      expert_analysis: cleanEditorialText(story.expert_analysis) || undefined,
      key_numbers: Array.isArray(story.key_numbers) ? story.key_numbers.filter(k => k && k.value) : undefined,
      people: Array.isArray(story.people) ? story.people.filter(p => p && p.name) : undefined,
      organizations: Array.isArray(story.organizations) ? story.organizations.filter(o => o && o.name) : undefined,
      countries: Array.isArray(story.countries) ? story.countries.filter(c => c && c.name) : undefined,
      did_you_know: cleanEditorialText(story.did_you_know) || undefined,
      historical_context: cleanEditorialText(story.historical_context) || undefined,
      future_outlook: cleanEditorialText(story.future_outlook) || undefined,
      reader_takeaways: cleanListValues(story.reader_takeaways).length ? cleanListValues(story.reader_takeaways) : undefined,
      timeline: cleanListValues(story.timeline).length ? cleanListValues(story.timeline) : undefined,
      what_happens_next: cleanEditorialText(story.what_happens_next) || undefined,
      vocabulary,
      sources: existingStory.sources || [{ name: sourceName || sourceUrl, url: sourceUrl }],
    },
  };
  
  // Validate originality
  let qualityScore = scoreArticle(cleaned, sourceBody, sourceTitle);
  
  if (!qualityPass(cleaned, sourceBody, sourceTitle) || qualityScore < 75) {
    // Retry with feedback
    const failures = describeQualityFailures(cleaned, sourceBody, sourceTitle);
    try {
      out = await aiJson(SYSTEM_PROMPT, `${generatePrompt}\n\nYour previous draft scored ${qualityScore}/100 and failed these checks: ${failures.join("; ")}. Rewrite from scratch with 7-10 substantial paragraphs of original prose, zero repetition, no outlet names in the body, five unique vocabulary words actually used in the article with EXACT dictionary definitions, no example sentences, and distinct bullet sections where Key Developments and Quick Insights share zero overlap.`, 0.82);
      if (!out?.title) return { success: false, reason: "AI retry returned no title" };
      
      // Re-sanitize
      const retryStory = out.story || {};
      const retryKD = cleanDistinctList(cleanListValues(retryStory.key_developments), [], 5);
      const retryQI = cleanDistinctList(cleanInsightValues(retryStory.quick_insights), retryKD, 6);
      const retryArticleTextForVocab = `${cleanEditorialText(retryStory.main_story || "")} ${cleanEditorialText(retryStory.summary || "")} ${cleanEditorialText(retryStory.background || "")}`;
      const retryVocab = filterVocabulary(retryStory.vocabulary || [], retryArticleTextForVocab).slice(0, 8);
      
      const retryCleaned = {
        ...out,
        title: cleanTitleBoundary(cleanEditorialText(out.title) || article.title),
        dek: truncateAtWordBoundary(cleanEditorialText(out.dek) || article.dek || "", 300),
        category: ALLOWED_SLUGS.includes(out.category) ? out.category : (article.category || "discovery"),
        story: {
          ...retryStory,
          summary: cleanEditorialText(retryStory.summary) || "",
          main_story: cleanEditorialText(retryStory.main_story) || "",
          background: cleanEditorialText(retryStory.background) || undefined,
          what_happened: cleanEditorialText(retryStory.what_happened) || undefined,
          why_it_matters: cleanEditorialText(retryStory.why_it_matters) || undefined,
          how_it_happened: cleanEditorialText(retryStory.how_it_happened) || undefined,
          who_and_where: cleanEditorialText(retryStory.who_and_where) || undefined,
          what_came_before: cleanEditorialText(retryStory.what_came_before) || undefined,
          key_developments: retryKD,
          quick_insights: retryQI,
          key_facts: cleanListValues(retryStory.key_facts).length ? cleanListValues(retryStory.key_facts) : undefined,
          expert_analysis: cleanEditorialText(retryStory.expert_analysis) || undefined,
          key_numbers: Array.isArray(retryStory.key_numbers) ? retryStory.key_numbers.filter(k => k && k.value) : undefined,
          people: Array.isArray(retryStory.people) ? retryStory.people.filter(p => p && p.name) : undefined,
          organizations: Array.isArray(retryStory.organizations) ? retryStory.organizations.filter(o => o && o.name) : undefined,
          countries: Array.isArray(retryStory.countries) ? retryStory.countries.filter(c => c && c.name) : undefined,
          did_you_know: cleanEditorialText(retryStory.did_you_know) || undefined,
          historical_context: cleanEditorialText(retryStory.historical_context) || undefined,
          future_outlook: cleanEditorialText(retryStory.future_outlook) || undefined,
          reader_takeaways: cleanListValues(retryStory.reader_takeaways).length ? cleanListValues(retryStory.reader_takeaways) : undefined,
          timeline: cleanListValues(retryStory.timeline).length ? cleanListValues(retryStory.timeline) : undefined,
          what_happens_next: cleanEditorialText(retryStory.what_happens_next) || undefined,
          vocabulary: retryVocab,
          sources: existingStory.sources || [{ name: sourceName || sourceUrl, url: sourceUrl }],
        },
      };
      
      qualityScore = scoreArticle(retryCleaned, sourceBody, sourceTitle);
      if (!qualityPass(retryCleaned, sourceBody, sourceTitle) || qualityScore < 70) {
        return { success: false, reason: `quality validation failed after retry (score: ${qualityScore})` };
      }
      return { success: true, data: retryCleaned };
    } catch (err) {
      return { success: false, reason: `AI retry failed: ${err.message}` };
    }
  }
  
  return { success: true, data: cleaned };
}

// --- Concurrency-limited map ---
async function pMap(arr, n, fn) {
  const out = new Array(arr.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= arr.length) return;
      out[idx] = await fn(arr[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, arr.length) }, worker));
  return out;
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : 0;
  const dryRun = args.includes("--dry-run");
  
  console.log("[regen] Fetching articles...");
  let query = supabase.from("articles").select("*").order("published_at", { ascending: false });
  if (limit > 0) query = query.limit(limit);
  
  const { data: articles, error: fetchErr } = await query;
  if (fetchErr) {
    console.error("[regen] Failed to fetch articles:", fetchErr.message);
    process.exit(1);
  }
  
  console.log(`[regen] Found ${articles.length} articles to process`);
  
  let success = 0;
  let failed = 0;
  const failures = [];
  
  await pMap(articles, CONCURRENCY, async (article, idx) => {
    console.log(`[regen] [${idx + 1}/${articles.length}] Processing: ${article.title}`);
    
    const result = await regenerateArticle(article);
    
    if (result.success) {
      if (dryRun) {
        console.log(`[regen] [${idx + 1}] DRY RUN - would update: ${article.title}`);
        success++;
        return;
      }
      
      // Update the database
      const { error: updateErr } = await supabase
        .from("articles")
        .update({
          title: result.data.title,
          dek: result.data.dek,
          category: result.data.category,
          story: result.data.story,
          reprocessed_at: new Date().toISOString(),
        })
        .eq("id", article.id);
      
      if (updateErr) {
        console.error(`[regen] [${idx + 1}] DB update failed: ${updateErr.message}`);
        failed++;
        failures.push({ title: article.title, reason: updateErr.message });
      } else {
        console.log(`[regen] [${idx + 1}] SUCCESS: ${article.title}`);
        success++;
      }
    } else {
      console.error(`[regen] [${idx + 1}] FAILED: ${article.title} — ${result.reason}`);
      failed++;
      failures.push({ title: article.title, reason: result.reason });
    }
  });
  
  console.log(`\n[regen] === COMPLETE ===`);
  console.log(`[regen] Success: ${success}`);
  console.log(`[regen] Failed: ${failed}`);
  console.log(`[regen] Total: ${articles.length}`);
  if (failures.length) {
    console.log(`[regen] Failures:`);
    for (const f of failures.slice(0, 20)) {
      console.log(`  - ${f.title}: ${f.reason}`);
    }
    if (failures.length > 20) console.log(`  ... and ${failures.length - 20} more`);
  }
}

main().catch(err => {
  console.error("[regen] Fatal error:", err);
  process.exit(1);
});
