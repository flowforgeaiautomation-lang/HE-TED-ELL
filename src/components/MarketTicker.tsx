import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import {
  fetchMarketPrices,
  formatNativePrice,
  formatNativeChange,
  formatTime,
  type MarketPrice,
} from "@/lib/market-utils";

const FALLBACK: MarketPrice[] = [
  { symbol: "SENSEX", name: "Sensex", category: "indices", region: "India", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "INR", exchange: "BSE" },
  { symbol: "NIFTY50", name: "NIFTY 50", category: "indices", region: "India", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "INR", exchange: "NSE" },
  { symbol: "BANKNIFTY", name: "Bank NIFTY", category: "indices", region: "India", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "INR", exchange: "NSE" },
  { symbol: "DJI", name: "Dow Jones", category: "indices", region: "US", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "USD", exchange: "NYSE" },
  { symbol: "SPX", name: "S&P 500", category: "indices", region: "US", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "USD", exchange: "NYSE" },
  { symbol: "IXIC", name: "NASDAQ", category: "indices", region: "US", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "USD", exchange: "NASDAQ" },
  { symbol: "GOLD", name: "Gold", category: "commodities", region: "Global", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "USD", unit: "/oz", exchange: "COMEX" },
  { symbol: "BRENT", name: "Brent Crude", category: "commodities", region: "Global", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "USD", unit: "/bbl", exchange: "ICE" },
  { symbol: "BTC", name: "Bitcoin", category: "crypto", region: "Global", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "USD", exchange: "CoinGecko" },
  { symbol: "ETH", name: "Ethereum", category: "crypto", region: "Global", price: null, change: null, change_percent: null, source: null, available: false, updated_at: null, currency: "USD", exchange: "CoinGecko" },
];

function Sparkline({ positive, seed }: { positive: boolean; seed: number }) {
  const color = positive ? "#22c55e" : "#ef4444";
  const points = useMemo(() => {
    const pts: string[] = [];
    let y = positive ? 12 : 4;
    for (let i = 0; i <= 40; i += 8) {
      const variance = ((Math.sin(i * 0.5 + seed) + 1) / 2) * 4;
      y = positive ? 12 - variance - (i / 40) * 6 : 4 + variance + (i / 40) * 6;
      pts.push(`${i},${Math.max(2, Math.min(14, y))}`);
    }
    return pts.join(" ");
  }, [positive, seed]);
  return (
    <svg width="40" height="16" viewBox="0 0 40 16" className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarketCard({ quote, index }: { quote: MarketPrice; index: number }) {
  const navigate = useNavigate();
  const positive = (quote.change_percent ?? 0) >= 0;
  const colorClass = quote.available
    ? positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    : "text-muted-foreground";
  const { text: changeText } = formatNativeChange(quote);
  const priceText = quote.available ? formatNativePrice(quote) : "Unavailable";

  function handleClick() { navigate({ to: "/markets", search: { asset: quote.symbol } }); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-3 px-4 py-2 border-r rule shrink-0 whitespace-nowrap hover:bg-foreground/[0.03] transition-colors text-left min-w-[240px] focus:outline-none focus:ring-2 focus:ring-foreground/40"
      aria-label={`${quote.name}, ${quote.available ? `${priceText}, ${changeText}` : "data temporarily unavailable"}. Click to view ${quote.name} market news.`}
      tabIndex={0}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{quote.name}</span>
        <span className="text-[0.55rem] text-muted-foreground uppercase tracking-wider">{quote.exchange ?? quote.region ?? quote.category}</span>
      </div>
      <div className="flex flex-col items-end ml-auto">
        <span className="text-sm font-medium tabular-nums">{priceText}</span>
        <span className={`text-xs tabular-nums ${colorClass} flex items-center gap-1`}>
          {quote.available && (positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />)}
          {quote.available ? changeText : "Data temporarily unavailable"}
        </span>
        {quote.available && quote.updated_at && (
          <span className="text-[0.5rem] text-muted-foreground/50 tabular-nums">{formatTime(quote.updated_at)}</span>
        )}
      </div>
      {quote.available && <Sparkline positive={positive} seed={index} />}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-r rule shrink-0 min-w-[240px] animate-pulse">
      <div className="h-3 w-16 bg-foreground/10 rounded" />
      <div className="h-3 w-20 bg-foreground/10 rounded ml-auto" />
    </div>
  );
}

export function MarketTicker() {
  const [quotes, setQuotes] = useState<MarketPrice[]>(FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await fetchMarketPrices();
      if (mounted && data.length > 0) { setQuotes(data); setLoaded(true); }
      else if (mounted) { setLoaded(true); }
    }
    load();
    const interval = setInterval(load, 15_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (paused || quotes.length === 0) return;
    const id = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = 240;
      const visibleCards = Math.max(1, Math.floor(el.clientWidth / cardWidth));
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const currentPos = el.scrollLeft;
      const nextPos = currentPos + visibleCards * cardWidth >= maxScroll - 10 ? 0 : currentPos + visibleCards * cardWidth;
      el.scrollTo({ left: nextPos, behavior: "smooth" });
    }, 6000);
    return () => clearInterval(id);
  }, [paused, quotes.length]);

  function handleManualScroll() {
    setPaused(true);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => setPaused(false), 10_000);
  }

  useEffect(() => { return () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); }; }, []);

  return (
    <section className="border-b rule bg-background overflow-hidden" aria-label="Live Global Markets" role="region">
      <div className="container-edit">
        <div className="flex items-center gap-3 py-2">
          <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r rule" aria-hidden="true">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[0.6rem] uppercase tracking-widest font-semibold text-muted-foreground hidden sm:inline">Live Markets</span>
          </div>
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-hide flex-1 scroll-smooth"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onScroll={handleManualScroll}
            style={{ scrollbarWidth: "none" }}
            role="marquee"
            aria-live="polite"
          >
            {!loaded
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              : quotes.map((q, i) => <MarketCard key={q.symbol} quote={q} index={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
