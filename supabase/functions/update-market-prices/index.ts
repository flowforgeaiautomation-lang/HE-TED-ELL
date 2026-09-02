import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Yahoo Finance symbols for real index/commodity/forex/crypto values
type SymbolCfg = {
  symbol: string;
  name: string;
  category: "indices" | "commodities" | "forex" | "crypto";
  region: string;
  yahoo: string;
  exchange: string;
  currency: string;
  timezone: string;
  unit?: string; // e.g. "/oz" for gold
};

const SYMBOLS: SymbolCfg[] = [
  // India — real NSE/BSE index values in INR points
  { symbol: "SENSEX", name: "Sensex", category: "indices", region: "India", yahoo: "^BSESN", exchange: "BSE", currency: "INR", timezone: "Asia/Kolkata" },
  { symbol: "NIFTY50", name: "NIFTY 50", category: "indices", region: "India", yahoo: "^NSEI", exchange: "NSE", currency: "INR", timezone: "Asia/Kolkata" },
  { symbol: "BANKNIFTY", name: "Bank NIFTY", category: "indices", region: "India", yahoo: "^NSEBANK", exchange: "NSE", currency: "INR", timezone: "Asia/Kolkata" },
  { symbol: "NIFTYIT", name: "NIFTY IT", category: "indices", region: "India", yahoo: "^CNXIT", exchange: "NSE", currency: "INR", timezone: "Asia/Kolkata" },
  // US — real index values in USD points
  { symbol: "DJI", name: "Dow Jones", category: "indices", region: "US", yahoo: "^DJI", exchange: "NYSE", currency: "USD", timezone: "America/New_York" },
  { symbol: "SPX", name: "S&P 500", category: "indices", region: "US", yahoo: "^GSPC", exchange: "NYSE", currency: "USD", timezone: "America/New_York" },
  { symbol: "IXIC", name: "NASDAQ Composite", category: "indices", region: "US", yahoo: "^IXIC", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York" },
  // Europe — real index values
  { symbol: "FTSE100", name: "FTSE 100", category: "indices", region: "Europe", yahoo: "^FTSE", exchange: "LSE", currency: "GBP", timezone: "Europe/London" },
  { symbol: "DAX", name: "DAX", category: "indices", region: "Europe", yahoo: "^GDAXI", exchange: "XETRA", currency: "EUR", timezone: "Europe/Berlin" },
  { symbol: "CAC40", name: "CAC 40", category: "indices", region: "Europe", yahoo: "^FCHI", exchange: "Euronext", currency: "EUR", timezone: "Europe/Paris" },
  // Asia — real index values
  { symbol: "N225", name: "Nikkei 225", category: "indices", region: "Asia", yahoo: "^N225", exchange: "TSE", currency: "JPY", timezone: "Asia/Tokyo" },
  { symbol: "HSI", name: "Hang Seng", category: "indices", region: "Asia", yahoo: "^HSI", exchange: "HKEX", currency: "HKD", timezone: "Asia/Hong_Kong" },
  { symbol: "SSEC", name: "Shanghai Composite", category: "indices", region: "Asia", yahoo: "000001.SS", exchange: "SSE", currency: "CNY", timezone: "Asia/Shanghai" },
  // Commodities — real futures prices in USD
  { symbol: "GOLD", name: "Gold", category: "commodities", region: "Global", yahoo: "GC=F", exchange: "COMEX", currency: "USD", timezone: "America/New_York", unit: "/oz" },
  { symbol: "SILVER", name: "Silver", category: "commodities", region: "Global", yahoo: "SI=F", exchange: "COMEX", currency: "USD", timezone: "America/New_York", unit: "/oz" },
  { symbol: "BRENT", name: "Brent Crude", category: "commodities", region: "Global", yahoo: "BZ=F", exchange: "ICE", currency: "USD", timezone: "America/New_York", unit: "/bbl" },
  { symbol: "WTI", name: "WTI Crude", category: "commodities", region: "Global", yahoo: "CL=F", exchange: "NYMEX", currency: "USD", timezone: "America/New_York", unit: "/bbl" },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodities", region: "Global", yahoo: "NG=F", exchange: "NYMEX", currency: "USD", timezone: "America/New_York", unit: "/MMBtu" },
  // Forex — real exchange rates
  { symbol: "USDINR", name: "USD/INR", category: "forex", region: "Global", yahoo: "INR=X", exchange: "Forex", currency: "INR", timezone: "UTC" },
  { symbol: "EURUSD", name: "EUR/USD", category: "forex", region: "Global", yahoo: "EURUSD=X", exchange: "Forex", currency: "USD", timezone: "UTC" },
  { symbol: "GBPUSD", name: "GBP/USD", category: "forex", region: "Global", yahoo: "GBPUSD=X", exchange: "Forex", currency: "USD", timezone: "UTC" },
  { symbol: "USDJPY", name: "USD/JPY", category: "forex", region: "Global", yahoo: "JPY=X", exchange: "Forex", currency: "JPY", timezone: "UTC" },
  // Crypto — CoinGecko for real prices
  { symbol: "BTC", name: "Bitcoin", category: "crypto", region: "Global", yahoo: "BTC-USD", exchange: "CoinGecko", currency: "USD", timezone: "UTC" },
  { symbol: "ETH", name: "Ethereum", category: "crypto", region: "Global", yahoo: "ETH-USD", exchange: "CoinGecko", currency: "USD", timezone: "UTC" },
];

async function fetchJson(url: string, timeoutMs = 8000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
      },
    });
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

type PriceResult = {
  price: number;
  change: number;
  changePercent: number;
  source: string;
  dayHigh: number | null;
  dayLow: number | null;
  prevClose: number | null;
  openPrice: number | null;
  volume: number | null;
  marketCap: number | null;
};

// Yahoo Finance v8 chart API — returns real index/commodity/forex values
async function tryYahooFinance(cfg: SymbolCfg): Promise<PriceResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.yahoo)}?interval=1d&includePrePost=false`;
  const data = await fetchJson(url);
  if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) return null;
  const result = data.chart.result[0];
  const meta = result.meta;
  if (!meta) return null;
  const price = validNum(meta.regularMarketPrice);
  if (price === null) return null;
  const prevClose = validNum(meta.chartPreviousClose) ?? validNum(meta.previousClose) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  return {
    price,
    change,
    changePercent,
    source: "Yahoo Finance",
    dayHigh: validNum(meta.regularMarketDayHigh),
    dayLow: validNum(meta.regularMarketDayLow),
    prevClose: prevClose !== price ? prevClose : null,
    openPrice: validNum(meta.regularMarketOpen),
    volume: validNum(meta.regularMarketVolume) ?? null,
    marketCap: null,
  };
}

// CoinGecko for crypto — gives market cap and volume
async function tryCoinGecko(cfg: SymbolCfg): Promise<PriceResult | null> {
  const coinId = cfg.symbol === "BTC" ? "bitcoin" : cfg.symbol === "ETH" ? "ethereum" : null;
  if (!coinId) return null;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;
  const data = await fetchJson(url);
  if (!data || !data[coinId]) return null;
  const coin = data[coinId];
  const price = validNum(coin.usd);
  if (price === null) return null;
  const changePercent = validNum(coin.usd_24h_change) ?? 0;
  const change = price * (changePercent / 100);
  return {
    price,
    change,
    changePercent,
    source: "CoinGecko",
    dayHigh: null,
    dayLow: null,
    prevClose: null,
    openPrice: null,
    volume: validNum(coin.usd_24h_vol) ?? null,
    marketCap: validNum(coin.usd_market_cap) ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const BATCH_SIZE = 6;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < SYMBOLS.length; i += BATCH_SIZE) {
      const batch = SYMBOLS.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (cfg) => {
        // Crypto: try CoinGecko first (better data), then Yahoo
        if (cfg.category === "crypto") {
          const cg = await tryCoinGecko(cfg);
          if (cg) return { cfg, result: cg };
        }
        // Everything else: Yahoo Finance
        const yf = await tryYahooFinance(cfg);
        if (yf) return { cfg, result: yf };
        // Crypto fallback to Yahoo
        if (cfg.category === "crypto") {
          const yfFallback = await tryYahooFinance(cfg);
          if (yfFallback) return { cfg, result: yfFallback };
        }
        return { cfg, result: null };
      }));

      for (const { cfg, result } of results) {
        if (result) {
          const { error } = await supabase
            .from("market_prices")
            .upsert({
              symbol: cfg.symbol,
              name: cfg.name,
              category: cfg.category,
              region: cfg.region,
              price: result.price,
              change: result.change,
              change_percent: result.changePercent,
              source: result.source,
              updated_at: new Date().toISOString(),
              available: true,
              day_high: result.dayHigh,
              day_low: result.dayLow,
              prev_close: result.prevClose,
              open_price: result.openPrice,
              volume: result.volume,
              market_cap: result.marketCap,
              currency: cfg.currency,
              exchange: cfg.exchange,
              unit: cfg.unit ?? null,
              market_timezone: cfg.timezone,
            });
          if (error) failed++;
          else updated++;
        } else {
          await supabase
            .from("market_prices")
            .update({ updated_at: new Date().toISOString(), available: false })
            .eq("symbol", cfg.symbol);
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, failed, total: SYMBOLS.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
