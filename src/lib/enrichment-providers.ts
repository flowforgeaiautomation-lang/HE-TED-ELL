// Server-only enrichment providers for OpenWeather, REST Countries, RapidAPI, and Cloudflare.
// These complement the existing news/AI/finance/space/image adapters in the codebase.

// ─── OpenWeather ──────────────────────────────────────────────────────────

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

function openWeatherKeys(): string[] {
  return [
    process.env.OPENWEATHER_API_KEY,
    process.env.OPENWEATHER_2API_KEY,
  ].filter(Boolean) as string[];
}

export async function fetchWeather(
  query: string,
  units: "metric" | "imperial" = "metric",
): Promise<WeatherData | null> {
  const keys = openWeatherKeys();
  if (!keys.length) return null;

  for (const key of keys) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=${units}&appid=${key}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) continue;
        continue;
      }
      const d = await res.json();
      if (!d?.main) continue;
      return {
        temp: Math.round(d.main.temp),
        feelsLike: Math.round(d.main.feels_like),
        humidity: d.main.humidity,
        windSpeed: Math.round(d.wind?.speed ?? 0),
        description: d.weather?.[0]?.description ?? "",
        icon: d.weather?.[0]?.icon ?? "",
        city: d.name ?? query,
        country: d.sys?.country ?? "",
        lat: d.coord?.lat ?? 0,
        lon: d.coord?.lon ?? 0,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchWeatherForecast(
  query: string,
  units: "metric" | "imperial" = "metric",
): Promise<{ dt: number; temp: number; description: string }[] | null> {
  const keys = openWeatherKeys();
  if (!keys.length) return null;

  for (const key of keys) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(query)}&units=${units}&cnt=8&appid=${key}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) continue;
        continue;
      }
      const d = await res.json();
      if (!d?.list) continue;
      return d.list.map((item: { dt: number; main: { temp: number }; weather: { description: string }[] }) => ({
        dt: item.dt,
        temp: Math.round(item.main.temp),
        description: item.weather?.[0]?.description ?? "",
      }));
    } catch {
      continue;
    }
  }
  return null;
}

// ─── REST Countries ───────────────────────────────────────────────────────

export interface CountryData {
  name: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  area: number;
  languages: string[];
  currencies: string[];
  flag: string;
  alpha2Code: string;
  alpha3Code: string;
  lat: number;
  lng: number;
}

export async function fetchCountry(
  countryCode: string,
): Promise<CountryData | null> {
  const key = process.env.RESTCOUNTRIES_API_KEY;
  const baseUrl = "https://restcountries.com/v3.1";

  // REST Countries v3.1 supports alpha code lookup
  const headers: Record<string, string> = {};
  if (key && key.length > 5) {
    headers["X-API-Key"] = key;
  }

  try {
    const res = await fetch(`${baseUrl}/alpha/${encodeURIComponent(countryCode)}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const c = Array.isArray(data) ? data[0] : data;
    if (!c) return null;

    return {
      name: c.name?.common ?? c.name?.official ?? "",
      capital: c.capital?.[0] ?? "",
      region: c.region ?? "",
      subregion: c.subregion ?? "",
      population: c.population ?? 0,
      area: c.area ?? 0,
      languages: c.languages ? Object.values(c.languages) as string[] : [],
      currencies: c.currencies ? Object.keys(c.currencies) : [],
      flag: c.flags?.png ?? c.flags?.svg ?? "",
      alpha2Code: c.cca2 ?? "",
      alpha3Code: c.cca3 ?? "",
      lat: c.latlng?.[0] ?? 0,
      lng: c.latlng?.[1] ?? 0,
    };
  } catch {
    return null;
  }
}

export async function fetchCountriesByRegion(
  region: string,
): Promise<CountryData[] | null> {
  const key = process.env.RESTCOUNTRIES_API_KEY;
  const baseUrl = "https://restcountries.com/v3.1";
  const headers: Record<string, string> = {};
  if (key && key.length > 5) {
    headers["X-API-Key"] = key;
  }

  try {
    const res = await fetch(`${baseUrl}/region/${encodeURIComponent(region)}?fields=name,capital,region,population,area,languages,currencies,flags,cca2,cca3,latlng,subregion`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((c: Record<string, unknown>) => ({
      name: (c.name as { common?: string })?.common ?? "",
      capital: (c.capital as string[])?.[0] ?? "",
      region: c.region as string,
      subregion: c.subregion as string,
      population: c.population as number,
      area: c.area as number,
      languages: c.languages ? Object.values(c.languages) as string[] : [],
      currencies: c.currencies ? Object.keys(c.currencies as Record<string, unknown>) : [],
      flag: (c.flags as { png?: string; svg?: string })?.png ?? (c.flags as { png?: string; svg?: string })?.svg ?? "",
      alpha2Code: c.cca2 as string,
      alpha3Code: c.cca3 as string,
      lat: (c.latlng as number[])?.[0] ?? 0,
      lng: (c.latlng as number[])?.[1] ?? 0,
    }));
  } catch {
    return null;
  }
}

// ─── RapidAPI ─────────────────────────────────────────────────────────────
// RapidAPI is a marketplace — requires knowing which specific API product is subscribed.
// Flagged as BLOCKED_PENDING_CONFIGURATION per the integration spec.
// The key is stored in env but no adapter is active until a subscribed product is identified.

export const RAPID_API_STATUS = "BLOCKED_PENDING_CONFIGURATION" as const;

export function rapidApiKey(): string | null {
  const k = process.env.RAPID_API_KEY;
  return k && k.length > 5 ? k : null;
}

// ─── Cloudflare ───────────────────────────────────────────────────────────
// Cloudflare key is for infrastructure/security, not content generation.
// Stored in env for potential Workers/caching/rate-limiting use.

export const CLOUDFLARE_STATUS = "CONFIGURED_BUT_UNVERIFIED" as const;

export function cloudflareKey(): string | null {
  const k = process.env.CLOUDFLARE_API_KEY;
  return k && k.length > 5 ? k : null;
}

// ─── Provider Registry ────────────────────────────────────────────────────

export interface ProviderStatus {
  envVar: string;
  name: string;
  status: string;
  purpose: string;
  categories: string[];
}

export function getProviderRegistry(): ProviderStatus[] {
  return [
    { envVar: "OPENAI_API_KEY", name: "OpenAI", status: process.env.OPENAI_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Article synthesis, summaries", categories: ["all"] },
    { envVar: "OPENAI_2API_KEY", name: "OpenAI (secondary)", status: (process.env.OPENAI_2API_KEY || process.env.OPENAI_API_KEY_2) ? "CONFIGURED" : "MISSING", purpose: "OpenAI Responses API / gpt-6-luna", categories: ["all"] },
    { envVar: "GEMINI_API_KEY", name: "Gemini", status: process.env.GEMINI_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Summarization, classification", categories: ["all"] },
    { envVar: "GEMINI_API_KEY_2", name: "Gemini (secondary)", status: process.env.GEMINI_API_KEY_2 ? "CONFIGURED" : "MISSING", purpose: "Failover Gemini", categories: ["all"] },
    { envVar: "GEMINI_API_KEY_3", name: "Gemini (tertiary)", status: process.env.GEMINI_API_KEY_3 ? "CONFIGURED" : "MISSING", purpose: "Failover Gemini", categories: ["all"] },
    { envVar: "HUGGINGFACE_API_KEY", name: "HuggingFace", status: process.env.HUGGINGFACE_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Classification, NER, embeddings", categories: ["all"] },
    { envVar: "OPENROUTER_API_KEY", name: "OpenRouter", status: process.env.OPENROUTER_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Model routing, failover", categories: ["all"] },
    { envVar: "GROQ_API_KEY", name: "Groq", status: process.env.GROQ_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Fast classification, summarization", categories: ["all"] },
    { envVar: "OPENWEATHER_API_KEY", name: "OpenWeather", status: process.env.OPENWEATHER_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Weather, forecasts", categories: ["climate", "nature", "world", "science"] },
    { envVar: "OPENWEATHER_2API_KEY", name: "OpenWeather (secondary)", status: process.env.OPENWEATHER_2API_KEY ? "CONFIGURED" : "MISSING", purpose: "Weather failover", categories: ["climate", "nature", "world", "science"] },
    { envVar: "RESTCOUNTRIES_API_KEY", name: "REST Countries", status: process.env.RESTCOUNTRIES_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Country profiles, geography", categories: ["world", "geography", "history", "culture"] },
    { envVar: "RAPID_API_KEY", name: "RapidAPI", status: RAPID_API_STATUS, purpose: "Marketplace — pending product identification", categories: [] },
    { envVar: "CLOUDFLARE_API_KEY", name: "Cloudflare", status: CLOUDFLARE_STATUS, purpose: "Infrastructure, caching, security", categories: [] },
    { envVar: "NEWSAPI_KEY", name: "NewsAPI", status: process.env.NEWSAPI_KEY ? "CONFIGURED" : "MISSING", purpose: "News discovery", categories: ["world", "science", "technology", "business"] },
    { envVar: "GNEWS_API_KEY", name: "GNews", status: process.env.GNEWS_API_KEY ? "CONFIGURED" : "MISSING", purpose: "International news", categories: ["world", "science", "technology", "business"] },
    { envVar: "WORLDNEWS_API_KEY", name: "WorldNews API", status: process.env.WORLDNEWS_API_KEY ? "CONFIGURED" : "MISSING", purpose: "World news", categories: ["world", "science", "nature", "culture"] },
    { envVar: "NEWSDATA_API_KEY", name: "NewsData", status: process.env.NEWSDATA_API_KEY ? "CONFIGURED" : "MISSING", purpose: "News discovery with filtering", categories: ["world", "science", "technology", "business"] },
    { envVar: "MEDIASTACK_API_KEY", name: "MediaStack", status: process.env.MEDIASTACK_API_KEY ? "CONFIGURED" : "MISSING", purpose: "News discovery", categories: ["world", "science", "technology", "business"] },
    { envVar: "CURRENTS_API_KEY", name: "Currents API", status: process.env.CURRENTS_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Latest news, international", categories: ["world", "science", "technology", "nature"] },
    { envVar: "PEXELS_API_KEY", name: "Pexels", status: process.env.PEXELS_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Stock photos", categories: ["all"] },
    { envVar: "PIXABAY_API_KEY", name: "Pixabay", status: process.env.PIXABAY_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Stock photos, illustrations", categories: ["all"] },
    { envVar: "NASA_API_KEY", name: "NASA", status: process.env.NASA_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Astronomy, space, science", categories: ["space", "astronomy", "science"] },
    { envVar: "FINNHUB_API_KEY", name: "Finnhub", status: process.env.FINNHUB_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Stock quotes, company profiles", categories: ["markets", "business", "finance"] },
    { envVar: "TWELVEDATA_API_KEY", name: "Twelve Data", status: process.env.TWELVEDATA_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Stock prices, time series", categories: ["markets", "finance", "business"] },
    { envVar: "ALPHAVANTAGE_API_KEY", name: "Alpha Vantage", status: process.env.ALPHAVANTAGE_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Market data, fundamentals", categories: ["finance", "markets", "business"] },
    { envVar: "FMP_API_KEY", name: "FMP", status: process.env.FMP_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Company profiles, financials", categories: ["business", "companies", "finance"] },
    { envVar: "POLYGON_API_KEY", name: "Polygon", status: process.env.POLYGON_API_KEY ? "CONFIGURED" : "MISSING", purpose: "Market data, aggregates", categories: ["markets", "finance", "business"] },
  ];
}
