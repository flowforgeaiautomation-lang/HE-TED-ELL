import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type MarketQuote = {
  symbol: string;
  name: string;
  category: "indices" | "commodities" | "forex" | "crypto" | "stocks";
  region?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  updatedAt: string | null;
  lastUpdated: number | null;
  source: string | null;
  available: boolean;
};

export type MarketGroup = {
  label: string;
  items: MarketSymbolConfig[];
};

export type MarketSymbolConfig = {
  symbol: string;
  name: string;
  category: MarketQuote["category"];
  region?: string;
  finnhub?: string;
  twelvedata?: string;
  fmp?: string;
  polygon?: string;
  alphavantage?: string;
};

export const MARKET_SYMBOLS: MarketSymbolConfig[] = [
  // India
  { symbol: "SENSEX", name: "Sensex", category: "indices", region: "India", finnhub: "BSESENSEX", twelvedata: "BSE:SENSEX", fmp: "BSESENSEX" },
  { symbol: "NIFTY50", name: "NIFTY 50", category: "indices", region: "India", finnhub: "NIFTY50", twelvedata: "NSE:NIFTY50", fmp: "NSEI" },
  { symbol: "BANKNIFTY", name: "Bank NIFTY", category: "indices", region: "India", finnhub: "NIFTYBANK", twelvedata: "NSE:BANKNIFTY", fmp: "NSEBANKNIFTY" },
  { symbol: "NIFTYIT", name: "NIFTY IT", category: "indices", region: "India", finnhub: "NIFTYIT", twelvedata: "NSE:NIFTYIT", fmp: "NSENIFTYIT" },
  // United States
  { symbol: "IXIC", name: "NASDAQ Composite", category: "indices", region: "US", finnhub: "^IXIC", twelvedata: "NASDAQ:IXIC", fmp: "^IXIC", polygon: "^IXIC" },
  { symbol: "SPX", name: "S&P 500", category: "indices", region: "US", finnhub: "^GSPC", twelvedata: "SPX", fmp: "^GSPC", polygon: "^GSPC" },
  { symbol: "DJI", name: "Dow Jones", category: "indices", region: "US", finnhub: "^DJI", twelvedata: "DJI", fmp: "^DJI", polygon: "^DJI" },
  // Europe
  { symbol: "FTSE100", name: "FTSE 100", category: "indices", region: "Europe", finnhub: "^FTSE", twelvedata: "FTSE:UKX", fmp: "^FTSE" },
  { symbol: "DAX", name: "DAX", category: "indices", region: "Europe", finnhub: "^GDAXI", twelvedata: "XETR:DAX", fmp: "^GDAXI" },
  { symbol: "CAC40", name: "CAC 40", category: "indices", region: "Europe", finnhub: "^FCHI", twelvedata: "Euronext:PX1", fmp: "^FCHI" },
  // Asia
  { symbol: "N225", name: "Nikkei 225", category: "indices", region: "Asia", finnhub: "^N225", twelvedata: "NIKKEI:NI225", fmp: "^N225" },
  { symbol: "HSI", name: "Hang Seng", category: "indices", region: "Asia", finnhub: "^HSI", twelvedata: "HKEX:HSI", fmp: "^HSI" },
  { symbol: "SSEC", name: "Shanghai Composite", category: "indices", region: "Asia", finnhub: "000001.SS", twelvedata: "SSE:000001", fmp: "000001.SS" },
  // Commodities
  { symbol: "GOLD", name: "Gold", category: "commodities", finnhub: "OANDA:XAU_USD", twelvedata: "XAU/USD", fmp: "GCUSD", alphavantage: "GC" },
  { symbol: "SILVER", name: "Silver", category: "commodities", finnhub: "OANDA:XAG_USD", twelvedata: "XAG/USD", fmp: "SIUSD", alphavantage: "SI" },
  { symbol: "BRENT", name: "Brent Crude", category: "commodities", finnhub: "OANDA:BCO_USD", twelvedata: "BRENT", fmp: "BRENT" },
  { symbol: "WTI", name: "WTI Crude", category: "commodities", finnhub: "OANDA:WTI_USD", twelvedata: "WTI", fmp: "CLUSD", alphavantage: "WTI" },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodities", finnhub: "OANDA:NATGAS_USD", twelvedata: "NG", fmp: "NGUSD", alphavantage: "NATURAL_GAS" },
  // Forex
  { symbol: "USDINR", name: "USD/INR", category: "forex", finnhub: "OANDA:USD_INR", twelvedata: "USD/INR", fmp: "USDINR", alphavantage: "USD/INR" },
  { symbol: "EURUSD", name: "EUR/USD", category: "forex", finnhub: "OANDA:EUR_USD", twelvedata: "EUR/USD", fmp: "EURUSD", alphavantage: "EUR/USD" },
  { symbol: "GBPUSD", name: "GBP/USD", category: "forex", finnhub: "OANDA:GBP_USD", twelvedata: "GBP/USD", fmp: "GBPUSD", alphavantage: "GBP/USD" },
  { symbol: "USDJPY", name: "USD/JPY", category: "forex", finnhub: "OANDA:USD_JPY", twelvedata: "USD/JPY", fmp: "USDJPY", alphavantage: "USD/JPY" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", category: "crypto", finnhub: "BINANCE:BTCUSDT", twelvedata: "BTC/USD", fmp: "BTCUSD", polygon: "X:BTCUSD" },
  { symbol: "ETH", name: "Ethereum", category: "crypto", finnhub: "BINANCE:ETHUSDT", twelvedata: "ETH/USD", fmp: "ETHUSD", polygon: "X:ETHUSD" },
];

export const MARKET_GROUPS: MarketGroup[] = [
  { label: "India", items: MARKET_SYMBOLS.filter((m) => m.region === "India") },
  { label: "United States", items: MARKET_SYMBOLS.filter((m) => m.region === "US") },
  { label: "Europe", items: MARKET_SYMBOLS.filter((m) => m.region === "Europe") },
  { label: "Asia", items: MARKET_SYMBOLS.filter((m) => m.region === "Asia") },
  { label: "Commodities", items: MARKET_SYMBOLS.filter((m) => m.category === "commodities") },
  { label: "Forex", items: MARKET_SYMBOLS.filter((m) => m.category === "forex") },
  { label: "Crypto", items: MARKET_SYMBOLS.filter((m) => m.category === "crypto") },
];

const cache = new Map<string, { data: MarketQuote; ts: number }>();
const CACHE_TTL = 20_000;

const API_KEYS = {
  finnhub: "d9kccs1r01qq9sqfu130d9kccs1r01qq9sqfu13g",
  twelvedata: "35cc7540b81e4d13932cfb931dba4ec1",
  alphavantage: "UCL7D9WS75IGTMQM",
  fmp: "Gmej9XaScIABNc9kxCZ8aDO6g8zeVuJx",
  polygon: "z9rRBTzme1CqLQbvwmQQcUCI7mesEp3b",
};

function getEnv(key: string): string | undefined {
  return process.env[key] || (import.meta as any).env?.[`VITE_${key}`] || undefined;
}

async function fetchJson(url: string, timeoutMs = 5000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function validNum(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

async function tryFinnhub(cfg: MarketSymbolConfig): Promise<MarketQuote | null> {
  const key = getEnv("FINNHUB_API_KEY") || API_KEYS.finnhub;
  if (!key || !cfg.finnhub) return null;
  const data = await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(cfg.finnhub)}&token=${key}`);
  if (!data || !data.c) return null;
  const price = validNum(data.c);
  if (price === null) return null;
  const prevClose = validNum(data.pc) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  return {
    symbol: cfg.symbol, name: cfg.name, category: cfg.category, region: cfg.region,
    price, change, changePercent, updatedAt: new Date().toISOString(),
    lastUpdated: Date.now(), source: "Finnhub", available: true,
  };
}

async function tryTwelvedata(cfg: MarketSymbolConfig): Promise<MarketQuote | null> {
  const key = getEnv("TWELVEDATA_API_KEY") || API_KEYS.twelvedata;
  if (!key || !cfg.twelvedata) return null;
  const data = await fetchJson(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(cfg.twelvedata)}&apikey=${key}`);
  if (!data || data.status === "error" || !data.close) return null;
  const price = validNum(data.close);
  if (price === null) return null;
  const prevClose = validNum(data.previous_close) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  return {
    symbol: cfg.symbol, name: cfg.name, category: cfg.category, region: cfg.region,
    price, change, changePercent, updatedAt: data.datetime ? new Date(data.datetime).toISOString() : new Date().toISOString(),
    lastUpdated: Date.now(), source: "Twelve Data", available: true,
  };
}

async function tryFmp(cfg: MarketSymbolConfig): Promise<MarketQuote | null> {
  const key = getEnv("FMP_API_KEY") || API_KEYS.fmp;
  if (!key || !cfg.fmp) return null;
  const data = await fetchJson(`https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(cfg.fmp)}?apikey=${key}`);
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const d = data[0];
  const price = validNum(d.price);
  if (price === null) return null;
  return {
    symbol: cfg.symbol, name: cfg.name, category: cfg.category, region: cfg.region,
    price, change: validNum(d.change) ?? 0, changePercent: validNum(d.changesPercentage) ?? 0,
    updatedAt: new Date().toISOString(), lastUpdated: Date.now(), source: "FMP", available: true,
  };
}

async function tryPolygon(cfg: MarketSymbolConfig): Promise<MarketQuote | null> {
  const key = getEnv("POLYGON_API_KEY") || API_KEYS.polygon;
  if (!key || !cfg.polygon) return null;
  const data = await fetchJson(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(cfg.polygon)}/prev?adjusted=true&apiKey=${key}`);
  if (!data || !data.results || data.results.length === 0) return null;
  const r = data.results[0];
  const price = validNum(r.c);
  if (price === null) return null;
  const prevClose = validNum(r.o) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  return {
    symbol: cfg.symbol, name: cfg.name, category: cfg.category, region: cfg.region,
    price, change, changePercent, updatedAt: new Date(r.t).toISOString(),
    lastUpdated: Date.now(), source: "Polygon", available: true,
  };
}

async function tryAlphavantage(cfg: MarketSymbolConfig): Promise<MarketQuote | null> {
  const key = getEnv("ALPHAVANTAGE_API_KEY") || API_KEYS.alphavantage;
  if (!key || !cfg.alphavantage) return null;
  const isForex = cfg.category === "forex" || cfg.alphavantage.includes("/");
  const isCrypto = cfg.category === "crypto";
  let url: string;
  if (isForex) {
    const [from, to] = cfg.alphavantage.split("/");
    url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${key}`;
  } else if (isCrypto) {
    url = `https://www.alphavantage.co/query?function=CRYPTO_INTRADAY&symbol=${cfg.alphavantage}&market=USD&interval=5min&apikey=${key}`;
  } else {
    url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${cfg.alphavantage}&apikey=${key}`;
  }
  const data = await fetchJson(url);
  if (!data) return null;
  let price: number | null = null;
  let change: number | null = null;
  let changePercent: number | null = null;
  if (isForex && data["Realtime Currency Exchange Rate"]) {
    price = validNum(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]);
  } else if (!isForex && !isCrypto && data["Global Quote"]) {
    const gq = data["Global Quote"];
    price = validNum(gq["05. price"]);
    change = validNum(gq["09. change"]);
    changePercent = validNum(gq["10. change percent"]?.replace("%", ""));
  }
  if (price === null) return null;
  return {
    symbol: cfg.symbol, name: cfg.name, category: cfg.category, region: cfg.region,
    price, change: change ?? 0, changePercent: changePercent ?? 0,
    updatedAt: new Date().toISOString(), lastUpdated: Date.now(), source: "Alpha Vantage", available: true,
  };
}

const PROVIDERS = [tryFinnhub, tryTwelvedata, tryFmp, tryPolygon, tryAlphavantage];

async function fetchQuote(cfg: MarketSymbolConfig): Promise<MarketQuote> {
  const cacheKey = cfg.symbol;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  for (const provider of PROVIDERS) {
    const result = await provider(cfg);
    if (result) {
      cache.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }
  }

  const unavailable: MarketQuote = {
    symbol: cfg.symbol, name: cfg.name, category: cfg.category, region: cfg.region,
    price: null, change: null, changePercent: null, updatedAt: null,
    lastUpdated: null, source: null, available: false,
  };
  cache.set(cacheKey, { data: unavailable, ts: Date.now() });
  return unavailable;
}

export const getMarketQuotes = createServerFn({ method: "GET" })(
  async () => {
    // Process in batches of 6 to avoid rate limits and speed up loading
    const BATCH_SIZE = 6;
    const results: MarketQuote[] = [];
    for (let i = 0; i < MARKET_SYMBOLS.length; i += BATCH_SIZE) {
      const batch = MARKET_SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(fetchQuote));
      results.push(...batchResults);
    }
    return results;
  },
);

export const getMarketQuotesByCategory = createServerFn({ method: "GET" })
  .validator(z.string().optional())
  .handler(async ({ data }) => {
    const filter = data;
    const symbols = filter ? MARKET_SYMBOLS.filter((m) => m.category === filter) : MARKET_SYMBOLS;
    return Promise.all(symbols.map(fetchQuote));
  });

export const searchMarkets = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data }) => {
    const q = data.toLowerCase().trim();
    if (!q) return [];
    return MARKET_SYMBOLS.filter(
      (m) => m.name.toLowerCase().includes(q) || m.symbol.toLowerCase().includes(q),
    ).map((m) => ({
      symbol: m.symbol,
      name: m.name,
      category: m.category,
      region: m.region,
    }));
  });
