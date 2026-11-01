import { useEffect, useState, useRef } from "react";
import { getSupabaseUrl, getSupabasePublishableKey } from "./supabase-config";

export type MarketPrice = {
  symbol: string;
  name: string;
  category: string;
  region: string | null;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  source: string | null;
  available: boolean;
  updated_at: string | null;
  day_high?: number | null;
  day_low?: number | null;
  prev_close?: number | null;
  open_price?: number | null;
  volume?: number | null;
  market_cap?: number | null;
  currency?: string | null;
  exchange?: string | null;
  unit?: string | null;
  market_timezone?: string | null;
};

export type Currency = "USD" | "INR" | "EUR" | "GBP" | "JPY";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export const CURRENCY_OPTIONS: { code: Currency; label: string; symbol: string }[] = [
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "INR", label: "INR — Indian Rupee", symbol: "₹" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "JPY", label: "JPY — Japanese Yen", symbol: "¥" },
];

// Approximate static FX rates (for display currency conversion only)
const FX_RATES: Record<Currency, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 152.0,
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabasePublishableKey();

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

const SELECT_COLS =
  "symbol,name,category,region,price,change,change_percent,source,available,updated_at,day_high,day_low,prev_close,open_price,volume,market_cap,currency,exchange,unit,market_timezone";

export async function fetchMarketPrices(): Promise<MarketPrice[]> {
  try {
    const headers: Record<string, string> = { apikey: SUPABASE_ANON_KEY };
    if (!isNewSupabaseApiKey(SUPABASE_ANON_KEY)) {
      headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/market_prices?select=${SELECT_COLS}&order=symbol.asc`, {
      headers,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function useMarketPrices(refreshMs = 15_000) {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const retryCount = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setInterval>;
    let retryTimer: ReturnType<typeof setTimeout>;

    async function load() {
      const data = await fetchMarketPrices();
      if (!mountedRef.current) return;
      if (data.length > 0) {
        setPrices(data);
        setLastUpdate(new Date());
        setLoading(false);
        retryCount.current = 0;
      } else {
        // Retry with backoff — don't give up, keep trying
        retryCount.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10_000);
        retryTimer = setTimeout(load, delay);
      }
    }

    load();
    timer = setInterval(load, refreshMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      clearTimeout(retryTimer);
    };
  }, [refreshMs]);

  return { prices, loading, lastUpdate };
}

// Convert a USD price to the display currency (for optional secondary display only)
export function convertUsdToCurrency(usdPrice: number, to: Currency): number {
  return usdPrice * FX_RATES[to];
}

// Format the PRIMARY value in its native format — indices use "pts", forex uses pair notation,
// commodities use currency + unit, crypto uses $ by default
export function formatNativePrice(quote: MarketPrice): string {
  if (!quote.available || quote.price === null) return "Live data temporarily unavailable";
  const price = quote.price;
  const category = quote.category;

  if (category === "indices") {
    // Indices are in points — show with thousands separators, 2 decimals
    const formatted = price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} pts`;
  }

  if (category === "forex") {
    // Forex: show the exchange rate with appropriate precision
    const decimals = price >= 100 ? 2 : price >= 10 ? 3 : 4;
    return price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  if (category === "crypto") {
    // Crypto: native is USD
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Commodities: currency symbol + unit
  const curSym = CURRENCY_SYMBOLS[(quote.currency as Currency) || "USD"] || "$";
  const unit = quote.unit ?? "";
  return `${curSym}${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`;
}

// Optional secondary value — convert crypto/commodities (USD-denominated) to display currency
export function formatConvertedPrice(quote: MarketPrice, displayCurrency: Currency): string | null {
  if (!quote.available || quote.price === null) return null;
  const category = quote.category;

  // Only convert USD-denominated instruments (crypto, commodities)
  // Never convert indices (they're in points) or forex (they're exchange rates)
  if (category === "indices" || category === "forex") return null;
  if (category !== "crypto" && category !== "commodities") return null;
  // Only show conversion if display currency differs from native currency
  const nativeCur = (quote.currency as Currency) || "USD";
  if (nativeCur === displayCurrency) return null;

  const sym = CURRENCY_SYMBOLS[displayCurrency];
  const converted = convertUsdToCurrency(quote.price, displayCurrency);
  return `≈ ${sym}${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format absolute change and percentage change in native currency
export function formatNativeChange(quote: MarketPrice): { text: string; isPositive: boolean; isNeutral: boolean } {
  if (!quote.available || (quote.change === null && quote.change_percent === null)) {
    return { text: "—", isPositive: false, isNeutral: true };
  }
  const category = quote.category;
  const change = quote.change ?? 0;
  const changePct = quote.change_percent ?? 0;
  const arrow = change >= 0 ? "▲" : "▼";
  const sign = change >= 0 ? "+" : "-";

  let chgStr: string;
  if (category === "indices") {
    chgStr = `${sign}${Math.abs(change).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (category === "forex") {
    const decimals = Math.abs(change) >= 100 ? 2 : Math.abs(change) >= 1 ? 3 : 4;
    chgStr = `${sign}${Math.abs(change).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  } else {
    const curSym = CURRENCY_SYMBOLS[(quote.currency as Currency) || "USD"] || "$";
    chgStr = `${sign}${curSym}${Math.abs(change).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const pctStr = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
  return {
    text: `${arrow} ${chgStr} (${pctStr})`,
    isPositive: changePct > 0,
    isNeutral: changePct === 0,
  };
}

export function formatTime(ts: string | null, timezone?: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: timezone || undefined });
  } catch {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
}

export type MarketStatus = "open" | "closed" | "pre" | "after" | "always" | "forex";

export function getMarketStatus(timezone: string | null, category: string): MarketStatus {
  if (category === "crypto") return "always";
  if (category === "forex") return "forex";
  if (!timezone) return "closed";
  try {
    const now = new Date();
    const localStr = now.toLocaleString("en-US", { timeZone: timezone, hour12: false });
    const local = new Date(localStr);
    const day = local.getDay();
    const totalMin = local.getHours() * 60 + local.getMinutes();
    const isWeekday = day >= 1 && day <= 5;
    if (!isWeekday) return "closed";
    // Market hours: 9:30 AM to 4:00 PM local time (standard for most exchanges)
    // Pre-market: 8:00 AM to 9:30 AM
    // After hours: 4:00 PM to 8:00 PM
    if (totalMin >= 480 && totalMin < 570) return "pre";
    if (totalMin >= 570 && totalMin < 960) return "open";
    if (totalMin >= 960 && totalMin < 1200) return "after";
    return "closed";
  } catch {
    return "closed";
  }
}

export const MARKET_STATUS_CONFIG: Record<MarketStatus, { label: string; emoji: string; dot: string; text: string }> = {
  open: { label: "Market Open", emoji: "🟢", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  closed: { label: "Market Closed", emoji: "🔴", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  pre: { label: "Pre-Market", emoji: "🟡", dot: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400" },
  after: { label: "After Hours", emoji: "🟠", dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  always: { label: "Live 24/7", emoji: "🌐", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  forex: { label: "Live (Forex)", emoji: "🌍", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" },
};

export function formatVolume(vol: number | null): string {
  if (vol === null || vol <= 0) return "—";
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
  return vol.toLocaleString("en-US");
}

export function formatMarketCap(cap: number | null, currency: Currency): string {
  if (cap === null || cap <= 0) return "—";
  const sym = CURRENCY_SYMBOLS[currency];
  const converted = convertUsdToCurrency(cap, currency);
  if (converted >= 1_000_000_000_000) return `${sym}${(converted / 1_000_000_000_000).toFixed(2)}T`;
  if (converted >= 1_000_000_000) return `${sym}${(converted / 1_000_000_000).toFixed(2)}B`;
  if (converted >= 1_000_000) return `${sym}${(converted / 1_000_000).toFixed(2)}M`;
  return `${sym}${converted.toLocaleString("en-US")}`;
}

// Format a detail value (for tooltips) in native format
export function formatDetailValue(value: number | null, quote: MarketPrice): string {
  if (value === null || value <= 0) return "—";
  const category = quote.category;
  if (category === "indices") {
    return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts`;
  }
  if (category === "forex") {
    const decimals = value >= 100 ? 2 : value >= 10 ? 3 : 4;
    return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  if (category === "crypto") {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const curSym = CURRENCY_SYMBOLS[(quote.currency as Currency) || "USD"] || "$";
  const unit = quote.unit ?? "";
  return `${curSym}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`;
}
