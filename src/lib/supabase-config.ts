// Hardcoded production Supabase configuration.
// These values are used as defaults when environment variables are missing
// or point to a deprecated/dead project. This prevents build-time .env reverts
// from breaking the production deployment.

const PRODUCTION_SUPABASE_URL = "https://myrteqlcfwckgdokzzhg.supabase.co";
const PRODUCTION_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cnRlcWxjZndja2dkb2t6emhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjE4OTgsImV4cCI6MjA5ODI5Nzg5OH0.lGAyAxmYrJAag1yONChoqV4-A1QQAkdWKxZp5IMJyII";

const DEAD_HOSTS = ["lmvmktjinliynphzctdi"];

function isDeadUrl(url: string): boolean {
  return DEAD_HOSTS.some((dead) => url.includes(dead));
}

function isInvalidKey(key: string): boolean {
<<<<<<< HEAD
  // Keys that are known to be rejected by the active project
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
=======
  // Empty or placeholder keys are invalid
  if (!key || key === "undefined" || key === "null") return true;
  return false;
>>>>>>> 37747a8 (fix: resolve hydration crash from window.matchMedia in SiteHeader during SSR)
}

export function getSupabaseUrl(): string {
  const envUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    "";
  if (envUrl && !isDeadUrl(envUrl)) return envUrl;
  return PRODUCTION_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  const envKey =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_ANON_KEY) ||
    "";
  if (envKey && !isInvalidKey(envKey)) return envKey;
  return PRODUCTION_SUPABASE_KEY;
}
