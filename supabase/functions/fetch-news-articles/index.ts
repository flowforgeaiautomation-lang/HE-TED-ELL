// v21 — All API key slots rotated per provider, OpenRouter token budget fixed, Gemini key fallback
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
// --- API Keys (from Supabase secrets only — no hardcoded fallbacks) ---
const GEMINI_KEYS = [
  Deno.env.get("GEMINI_API_KEY"),
  Deno.env.get("GEMINI_API_KEY_2"),
  Deno.env.get("GEMINI_API_KEY_3"),
  Deno.env.get("GEMINI_API_KEY_4"),
].filter(Boolean) as string[];
const OPENAI_KEYS = [
  Deno.env.get("OPENAI_API_KEY"),
  Deno.env.get("OPENAI_API_KEY_2"),
  Deno.env.get("OPENAI_2API_KEY"),
  Deno.env.get("OPENAI_API"),
].filter(Boolean) as string[];
const OPENROUTER_KEYS = [
  Deno.env.get("OPENROUTER_API_KEY"),
  Deno.env.get("OPENROUTER_API_KEY_2"),
  Deno.env.get("OPENROUTER_API_KEY_3"),
].filter(Boolean) as string[];
const HUGGINGFACE_KEY = Deno.env.get("HUGGINGFACE_API_KEY") || "";
const GROQ_KEY = Deno.env.get("GROQ_API_KEY") || "";
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const PEXELS_KEY = Deno.env.get("PEXELS_API_KEY") || "";
const PIXABAY_KEY = Deno.env.get("PIXABAY_API_KEY") || "";
const GNEWS_KEY = Deno.env.get("GNEWS_API_KEY") || "";
const NEWSDATA_KEY = Deno.env.get("NEWSDATA_API_KEY") || "";
const MEDIASTACK_KEY = Deno.env.get("MEDIASTACK_API_KEY") || "";
const CURRENTS_KEY = Deno.env.get("CURRENTS_API_KEY") || "";
const WORLDNEWS_KEY = Deno.env.get("WORLDNEWS_API_KEY") || "";
const NEWSAPI_KEY = Deno.env.get("NEWSAPI_KEY") || "";
const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY") || "";
const FMP_KEY = Deno.env.get("FMP_API_KEY") || "";
const GUARDIAN_KEY = Deno.env.get("GUARDIAN_API_KEY") || "";
const NASA_KEY = Deno.env.get("NASA_API_KEY") || "";
const ALPHAVANTAGE_KEY = Deno.env.get("ALPHAVANTAGE_API_KEY") || "";
const TWELVEDATA_KEY = Deno.env.get("TWELVEDATA_API_KEY") || "";
const POLYGON_KEY = Deno.env.get("POLYGON_API_KEY") || "";
const OPENWEATHER_KEY = Deno.env.get("OPENWEATHER_API_KEY") || "";
let openaiKeyIdx = 0;

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
let geminiModelIdx = 0;
