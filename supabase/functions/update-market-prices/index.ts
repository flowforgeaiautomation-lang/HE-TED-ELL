import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// Market data edge function: Yahoo Finance + Finnhub + TwelveData + FMP + Polygon + Alpha Vantage + CoinGecko

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type SymbolCfg = {
  symbol: string;
  name: string;
  category: "indices" | "commodities" | "forex" | "crypto" | "stocks";
  region: string;
  yahoo: string;
  exchange: string;
  currency: string;
  timezone: string;
  unit?: string;
  finnhub?: string;
  twelvedata?: string;
  fmp?: string;
  polygon?: string;
  alphavantage?: string;
};

const SYMBOLS: SymbolCfg[] = [
  // India
  { symbol: "SENSEX", name: "Sensex", category: "indices", region: "India", yahoo: "^BSESN", exchange: "BSE", currency: "INR", timezone: "Asia/Kolkata", finnhub: "BSESENSEX", twelvedata: "BSE:SENSEX", fmp: "BSESENSEX" },
  { symbol: "NIFTY50", name: "NIFTY 50", category: "indices", region: "India", yahoo: "^NSEI", exchange: "NSE", currency: "INR", timezone: "Asia/Kolkata", finnhub: "NIFTY50", twelvedata: "NSE:NIFTY50", fmp: "NSEI" },
  { symbol: "BANKNIFTY", name: "Bank NIFTY", category: "indices", region: "India", yahoo: "^NSEBANK", exchange: "NSE", currency: "INR", timezone: "Asia/Kolkata", finnhub: "NIFTYBANK", twelvedata: "NSE:BANKNIFTY", fmp: "NSEBANKNIFTY" },
  { symbol: "NIFTYIT", name: "NIFTY IT", category: "indices", region: "India", yahoo: "^CNXIT", exchange: "NSE", currency: "INR", timezone: "Asia/Kolkata", finnhub: "NIFTYIT", twelvedata: "NSE:NIFTYIT", fmp: "NSENIFTYIT" },
  // US indices
  { symbol: "DJI", name: "Dow Jones", category: "indices", region: "US", yahoo: "^DJI", exchange: "NYSE", currency: "USD", timezone: "America/New_York", finnhub: "^DJI", twelvedata: "DJI", fmp: "^DJI", polygon: "^DJI" },
  { symbol: "SPX", name: "S&P 500", category: "indices", region: "US", yahoo: "^GSPC", exchange: "NYSE", currency: "USD", timezone: "America/New_York", finnhub: "^GSPC", twelvedata: "SPX", fmp: "^GSPC", polygon: "^GSPC" },
  { symbol: "IXIC", name: "NASDAQ Composite", category: "indices", region: "US", yahoo: "^IXIC", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "^IXIC", twelvedata: "NASDAQ:IXIC", fmp: "^IXIC", polygon: "^IXIC" },
  // US stocks
  { symbol: "AAPL", name: "Apple", category: "stocks", region: "US", yahoo: "AAPL", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "AAPL", twelvedata: "AAPL", fmp: "AAPL", polygon: "AAPL", alphavantage: "AAPL" },
  { symbol: "MSFT", name: "Microsoft", category: "stocks", region: "US", yahoo: "MSFT", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "MSFT", twelvedata: "MSFT", fmp: "MSFT", polygon: "MSFT", alphavantage: "MSFT" },
  { symbol: "GOOGL", name: "Alphabet", category: "stocks", region: "US", yahoo: "GOOGL", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "GOOGL", twelvedata: "GOOGL", fmp: "GOOGL", polygon: "GOOGL", alphavantage: "GOOGL" },
  { symbol: "AMZN", name: "Amazon", category: "stocks", region: "US", yahoo: "AMZN", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "AMZN", twelvedata: "AMZN", fmp: "AMZN", polygon: "AMZN", alphavantage: "AMZN" },
  { symbol: "NVDA", name: "NVIDIA", category: "stocks", region: "US", yahoo: "NVDA", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "NVDA", twelvedata: "NVDA", fmp: "NVDA", polygon: "NVDA", alphavantage: "NVDA" },
  { symbol: "TSLA", name: "Tesla", category: "stocks", region: "US", yahoo: "TSLA", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "TSLA", twelvedata: "TSLA", fmp: "TSLA", polygon: "TSLA", alphavantage: "TSLA" },
  { symbol: "META", name: "Meta Platforms", category: "stocks", region: "US", yahoo: "META", exchange: "NASDAQ", currency: "USD", timezone: "America/New_York", finnhub: "META", twelvedata: "META", fmp: "META", polygon: "META", alphavantage: "META" },
  // Europe
  { symbol: "FTSE100", name: "FTSE 100", category: "indices", region: "Europe", yahoo: "^FTSE", exchange: "LSE", currency: "GBP", timezone: "Europe/London", finnhub: "^FTSE", twelvedata: "FTSE:UKX", fmp: "^FTSE" },
  { symbol: "DAX", name: "DAX", category: "indices", region: "Europe", yahoo: "^GDAXI", exchange: "XETRA", currency: "EUR", timezone: "Europe/Berlin", finnhub: "^GDAXI", twelvedata: "XETR:DAX", fmp: "^GDAXI" },
  { symbol: "CAC40", name: "CAC 40", category: "indices", region: "Europe", yahoo: "^FCHI", exchange: "Euronext", currency: "EUR", timezone: "Europe/Paris", finnhub: "^FCHI", twelvedata: "Euronext:PX1", fmp: "^FCHI" },
  // Asia
  { symbol: "N225", name: "Nikkei 225", category: "indices", region: "Asia", yahoo: "^N225", exchange: "TSE", currency: "JPY", timezone: "Asia/Tokyo", finnhub: "^N225", twelvedata: "NIKKEI:NI225", fmp: "^N225" },
  { symbol: "HSI", name: "Hang Seng", category: "indices", region: "Asia", yahoo: "^HSI", exchange: "HKEX", currency: "HKD", timezone: "Asia/Hong_Kong", finnhub: "^HSI", twelvedata: "HKEX:HSI", fmp: "^HSI" },
  { symbol: "SSEC", name: "Shanghai Composite", category: "indices", region: "Asia", yahoo: "000001.SS", exchange: "SSE", currency: "CNY", timezone: "Asia/Shanghai", finnhub: "000001.SS", twelvedata: "SSE:000001", fmp: "000001.SS" },
  // Commodities
  { symbol: "GOLD", name: "Gold", category: "commodities", region: "Global", yahoo: "GC=F", exchange: "COMEX", currency: "USD", timezone: "America/New_York", unit: "/oz", finnhub: "OANDA:XAU_USD", twelvedata: "XAU/USD", fmp: "GCUSD", alphavantage: "GC" },
  { symbol: "SILVER", name: "Silver", category: "commodities", region: "Global", yahoo: "SI=F", exchange: "COMEX", currency: "USD", timezone: "America/New_York", unit: "/oz", finnhub: "OANDA:XAG_USD", twelvedata: "XAG/USD", fmp: "SIUSD", alphavantage: "SI" },
  { symbol: "BRENT", name: "Brent Crude", category: "commodities", region: "Global", yahoo: "BZ=F", exchange: "ICE", currency: "USD", timezone: "America/New_York", unit: "/bbl", finnhub: "OANDA:BCO_USD", twelvedata: "BRENT", fmp: "BRENT" },
  { symbol: "WTI", name: "WTI Crude", category: "commodities", region: "Global", yahoo: "CL=F", exchange: "NYMEX", currency: "USD", timezone: "America/New_York", unit: "/bbl", finnhub: "OANDA:WTI_USD", twelvedata: "WTI", fmp: "CLUSD", alphavantage: "WTI" },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodities", region: "Global", yahoo: "NG=F", exchange: "NYMEX", currency: "USD", timezone: "America/New_York", unit: "/MMBtu", finnhub: "OANDA:NATGAS_USD", twelvedata: "NG", fmp: "NGUSD", alphavantage: "NATURAL_GAS" },
  { symbol: "COPPER", name: "Copper", category: "commodities", region: "Global", yahoo: "HG=F", exchange: "COMEX", currency: "USD", timezone: "America/New_York", unit: "/lb", fmp: "HGUSD" },
  // Forex
  { symbol: "USDINR", name: "USD/INR", category: "forex", region: "Global", yahoo: "INR=X", exchange: "Forex", currency: "INR", timezone: "UTC", finnhub: "OANDA:USD_INR", twelvedata: "USD/INR", fmp: "USDINR", alphavantage: "USD/INR" },
  { symbol: "EURUSD", name: "EUR/USD", category: "forex", region: "Global", yahoo: "EURUSD=X", exchange: "Forex", currency: "USD", timezone: "UTC", finnhub: "OANDA:EUR_USD", twelvedata: "EUR/USD", fmp: "EURUSD", alphavantage: "EUR/USD" },
  { symbol: "GBPUSD", name: "GBP/USD", category: "forex", region: "Global", yahoo: "GBPUSD=X", exchange: "Forex", currency: "USD", timezone: "UTC", finnhub: "OANDA:GBP_USD", twelvedata: "GBP/USD", fmp: "GBPUSD", alphavantage: "GBP/USD" },
  { symbol: "USDJPY", name: "USD/JPY", category: "forex", region: "Global", yahoo: "JPY=X", exchange: "Forex", currency: "JPY", timezone: "UTC", finnhub: "OANDA:USD_JPY", twelvedata: "USD/JPY", fmp: "USDJPY", alphavantage: "USD/JPY" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", category: "crypto", region: "Global", yahoo: "BTC-USD", exchange: "CoinGecko", currency: "USD", timezone: "UTC", finnhub: "BINANCE:BTCUSDT", twelvedata: "BTC/USD", fmp: "BTCUSD", polygon: "X:BTCUSD" },
  { symbol: "ETH", name: "Ethereum", category: "crypto", region: "Global", yahoo: "ETH-USD", exchange: "CoinGecko", currency: "USD", timezone: "UTC", finnhub: "BINANCE:ETHUSDT", twelvedata: "ETH/USD", fmp: "ETHUSD", polygon: "X:ETHUSD" },
  { symbol: "SOL", name: "Solana", category: "crypto", region: "Global", yahoo: "SOL-USD", exchange: "CoinGecko", currency: "USD", timezone: "UTC", finnhub: "BINANCE:SOLUSDT", twelvedata: "SOL/USD", fmp: "SOLUSD", polygon: "X:SOLUSD" },
  { symbol: "XRP", name: "XRP", category: "crypto", region: "Global", yahoo: "XRP-USD", exchange: "CoinGecko", currency: "USD", timezone: "UTC", finnhub: "BINANCE:XRPUSDT", twelvedata: "XRP/USD", fmp: "XRPUSD", polygon: "X:XRPUSD" },
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

// Yahoo Finance
async function tryYahooFinance(cfg: SymbolCfg): Promise<PriceResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.yahoo)}?interval=1d&includePrePost=false`;
  const data = await fetchJson(url);
  if (!data?.chart?.result?.[0]) return null;
  const meta = data.chart.result[0].meta;
  if (!meta) return null;
  const price = validNum(meta.regularMarketPrice);
  if (price === null) return null;
  const prevClose = validNum(meta.chartPreviousClose) ?? validNum(meta.previousClose) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  return { price, change, changePercent, source: "Yahoo Finance",
    dayHigh: validNum(meta.regularMarketDayHigh), dayLow: validNum(meta.regularMarketDayLow),
    prevClose: prevClose !== price ? prevClose : null, openPrice: validNum(meta.regularMarketOpen),
    volume: validNum(meta.regularMarketVolume) ?? null, marketCap: null };
}

// CoinGecko for crypto
async function tryCoinGecko(cfg: SymbolCfg): Promise<PriceResult | null> {
  const coinMap: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple" };
  const coinId = coinMap[cfg.symbol];
  if (!coinId) return null;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;
  const data = await fetchJson(url);
  if (!data?.[coinId]) return null;
  const coin = data[coinId];
  const price = validNum(coin.usd);
  if (price === null) return null;
  const changePercent = validNum(coin.usd_24h_change) ?? 0;
  return { price, change: price * (changePercent / 100), changePercent, source: "CoinGecko",
    dayHigh: null, dayLow: null, prevClose: null, openPrice: null,
    volume: validNum(coin.usd_24h_vol) ?? null, marketCap: validNum(coin.usd_market_cap) ?? null };
}

// Finnhub
async function tryFinnhub(cfg: SymbolCfg): Promise<PriceResult | null> {
  const key = Deno.env.get("FINNHUB_API_KEY") ?? "d9kccs1r01qq9sqfu130d9kccs1r01qq9sqfu13g";
  if (!cfg.finnhub) return null;
  const data = await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(cfg.finnhub)}&token=${key}`);
  if (!data?.c) return null;
  const price = validNum(data.c);
  if (price === null) return null;
  const prevClose = validNum(data.pc) ?? price;
  const change = price - prevClose;
  return { price, change, changePercent: prevClose > 0 ? (change / prevClose) * 100 : 0, source: "Finnhub",
    dayHigh: validNum(data.h), dayLow: validNum(data.l), prevClose: prevClose !== price ? prevClose : null,
    openPrice: validNum(data.o), volume: null, marketCap: null };
}

// Twelve Data
async function tryTwelvedata(cfg: SymbolCfg): Promise<PriceResult | null> {
  const key = Deno.env.get("TWELVEDATA_API_KEY") ?? "35cc7540b81e4d13932cfb931dba4ec1";
  if (!cfg.twelvedata) return null;
  const data = await fetchJson(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(cfg.twelvedata)}&apikey=${key}`);
  if (!data || data.status === "error" || !data.close) return null;
  const price = validNum(data.close);
  if (price === null) return null;
  const prevClose = validNum(data.previous_close) ?? price;
  const change = price - prevClose;
  return { price, change, changePercent: prevClose > 0 ? (change / prevClose) * 100 : 0, source: "Twelve Data",
    dayHigh: validNum(data.high), dayLow: validNum(data.low), prevClose: prevClose !== price ? prevClose : null,
    openPrice: validNum(data.open), volume: validNum(data.volume), marketCap: validNum(data.market_cap) };
}

// FMP
async function tryFmp(cfg: SymbolCfg): Promise<PriceResult | null> {
  const key = Deno.env.get("FMP_API_KEY") ?? "Gmej9XaScIABNc9kxCZ8aDO6g8zeVuJx";
  if (!cfg.fmp) return null;
  const data = await fetchJson(`https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(cfg.fmp)}?apikey=${key}`);
  if (!Array.isArray(data) || data.length === 0) return null;
  const d = data[0];
  const price = validNum(d.price);
  if (price === null) return null;
  return { price, change: validNum(d.change) ?? 0, changePercent: validNum(d.changesPercentage) ?? 0, source: "FMP",
    dayHigh: validNum(d.dayHigh), dayLow: validNum(d.dayLow), prevClose: validNum(d.previousClose),
    openPrice: validNum(d.open), volume: validNum(d.volume), marketCap: validNum(d.marketCap) };
}

// Polygon
async function tryPolygon(cfg: SymbolCfg): Promise<PriceResult | null> {
  const key = Deno.env.get("POLYGON_API_KEY") ?? "z9rRBTzme1CqLQbvwmQQcUCI7mesEp3b";
  if (!cfg.polygon) return null;
  const data = await fetchJson(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(cfg.polygon)}/prev?adjusted=true&apiKey=${key}`);
  if (!data?.results?.[0]) return null;
  const r = data.results[0];
  const price = validNum(r.c);
  if (price === null) return null;
  const prevClose = validNum(r.o) ?? price;
  const change = price - prevClose;
  return { price, change, changePercent: prevClose > 0 ? (change / prevClose) * 100 : 0, source: "Polygon",
    dayHigh: validNum(r.h), dayLow: validNum(r.l), prevClose: prevClose !== price ? prevClose : null,
    openPrice: validNum(r.o), volume: validNum(r.v), marketCap: null };
}

// Alpha Vantage
async function tryAlphavantage(cfg: SymbolCfg): Promise<PriceResult | null> {
  const key = Deno.env.get("ALPHAVANTAGE_API_KEY") ?? "UCL7D9WS75IGTMQM";
  if (!cfg.alphavantage) return null;
  const isForex = cfg.category === "forex" || cfg.alphavantage.includes("/");
  let url: string;
  if (isForex) {
    const [from, to] = cfg.alphavantage.split("/");
    url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${key}`;
  } else {
    url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${cfg.alphavantage}&apikey=${key}`;
  }
  const data = await fetchJson(url);
  if (!data) return null;
  let price: number | null = null;
  if (isForex && data["Realtime Currency Exchange Rate"]) {
    price = validNum(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]);
  } else if (data["Global Quote"]) {
    const gq = data["Global Quote"];
    price = validNum(gq["05. price"]);
  }
  if (price === null) return null;
  return { price, change: 0, changePercent: 0, source: "Alpha Vantage",
    dayHigh: null, dayLow: null, prevClose: null, openPrice: null, volume: null, marketCap: null };
}

async function fetchPrice(cfg: SymbolCfg): Promise<PriceResult | null> {
  if (cfg.category === "crypto") {
    const cg = await tryCoinGecko(cfg);
    if (cg) return cg;
  }
  const providers = [tryYahooFinance, tryFinnhub, tryTwelvedata, tryFmp, tryPolygon, tryAlphavantage];
  for (const provider of providers) {
    const result = await provider(cfg);
    if (result) return result;
  }
  return null;
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
        const result = await fetchPrice(cfg);
        return { cfg, result };
      }));

      for (const { cfg, result } of results) {
        if (result) {
          const { error } = await supabase.from("market_prices").upsert({
            symbol: cfg.symbol, name: cfg.name, category: cfg.category, region: cfg.region,
            price: result.price, change: result.change, change_percent: result.changePercent,
            source: result.source, updated_at: new Date().toISOString(), available: true,
            day_high: result.dayHigh, day_low: result.dayLow, prev_close: result.prevClose,
            open_price: result.openPrice, volume: result.volume, market_cap: result.marketCap,
            currency: cfg.currency, exchange: cfg.exchange, unit: cfg.unit ?? null,
            market_timezone: cfg.timezone,
          });
          if (error) failed++; else updated++;
        } else {
          await supabase.from("market_prices")
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
