import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, TrendingUp, TrendingDown, Activity, X, ChevronDown, ChevronUp, Info, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { listArticles } from "@/lib/articles.functions";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardSkeletonGrid } from "@/components/ArticleCardSkeleton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import type { ArticleSummary } from "@/lib/types";
import {
  useMarketPrices,
  formatNativePrice,
  formatConvertedPrice,
  formatNativeChange,
  formatTime,
  getMarketStatus,
  MARKET_STATUS_CONFIG,
  formatVolume,
  formatMarketCap,
  formatDetailValue,
  CURRENCY_OPTIONS,
  type MarketPrice,
  type Currency,
} from "@/lib/market-utils";

const PAGE_SIZE = 24;

// Only fetch genuinely financial news categories — exclude promotional/irrelevant content
const FINANCIAL_CATEGORIES = ["markets", "economics", "business", "investing", "technology", "world"];

const MARKET_GROUPS_ORDER = [
  { label: "India", categories: ["indices"], regions: ["India"] },
  { label: "United States", categories: ["indices"], regions: ["US"] },
  { label: "Europe", categories: ["indices"], regions: ["Europe"] },
  { label: "Asia", categories: ["indices"], regions: ["Asia"] },
  { label: "Commodities", categories: ["commodities"], regions: ["Global"] },
  { label: "Forex", categories: ["forex"], regions: ["Global"] },
  { label: "Crypto", categories: ["crypto"], regions: ["Global"] },
];

export const Route = createFileRoute("/markets")({
  validateSearch: (s: Record<string, unknown>) => ({
    asset: typeof s.asset === "string" ? s.asset : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Markets — The United Hell" },
      { name: "description", content: "Live global market data, financial news, stocks, indices, commodities, forex, and crypto." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Markets — The United Hell" },
      { property: "og:description", content: "Live global market data and financial news." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/markets") },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Markets — The United Hell" },
      { name: "twitter:description", content: "Live global market data and financial news." },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/markets") }],
  }),
  component: MarketsPage,
});

function Tooltip({ quote, currency }: { quote: MarketPrice; currency: Currency }) {
  return (
    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-background border rule shadow-lg p-4 text-xs space-y-2 rounded-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Current Price</span><span className="font-medium tabular-nums">{formatNativePrice(quote)}</span></div>
      {quote.open_price != null && quote.open_price > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Open</span><span className="font-medium tabular-nums">{formatDetailValue(quote.open_price, quote)}</span></div>
      )}
      {quote.day_high != null && quote.day_high > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Day High</span><span className="font-medium tabular-nums text-green-600 dark:text-green-400">{formatDetailValue(quote.day_high, quote)}</span></div>
      )}
      {quote.day_low != null && quote.day_low > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Day Low</span><span className="font-medium tabular-nums text-red-600 dark:text-red-400">{formatDetailValue(quote.day_low, quote)}</span></div>
      )}
      {quote.prev_close != null && quote.prev_close > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Previous Close</span><span className="font-medium tabular-nums">{formatDetailValue(quote.prev_close, quote)}</span></div>
      )}
      {quote.volume != null && quote.volume > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="font-medium tabular-nums">{formatVolume(quote.volume)}</span></div>
      )}
      {quote.market_cap != null && quote.market_cap > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Market Cap</span><span className="font-medium tabular-nums">{formatMarketCap(quote.market_cap, currency)}</span></div>
      )}
      <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="font-medium">{quote.currency ?? "—"}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Exchange</span><span className="font-medium">{quote.exchange ?? "—"}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Timezone</span><span className="font-medium">{quote.market_timezone ?? "—"}</span></div>
    </div>
  );
}

function MarketCard({ quote, currency, isActive, onClick }: {
  quote: MarketPrice;
  currency: Currency;
  isActive: boolean;
  onClick: () => void;
}) {
  const [showTip, setShowTip] = useState(false);
  const status = getMarketStatus(quote.market_timezone ?? null, quote.category);
  const statusCfg = MARKET_STATUS_CONFIG[status];
  const { text: changeText, isPositive, isNeutral } = formatNativeChange(quote);
  const changeColor = isNeutral ? "text-muted-foreground" : isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  const primaryPrice = formatNativePrice(quote);
  const convertedPrice = formatConvertedPrice(quote, currency);
  const categoryLabel = quote.category === "forex" ? "Foreign Exchange" : quote.category === "crypto" ? "Cryptocurrency" : quote.category === "indices" ? "Index" : quote.category.charAt(0).toUpperCase() + quote.category.slice(1);

  return (
    <div
      className={`group relative border rule p-5 cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-foreground/40 ${isActive ? "ring-1 ring-foreground bg-muted/30" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      aria-label={`${quote.name}, ${quote.available ? primaryPrice : "data unavailable"}`}
    >
      {/* Header: name + category */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{quote.name}</h3>
          <span className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{categoryLabel}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[0.55rem] font-semibold uppercase tracking-wider ${statusCfg.text}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${statusCfg.dot} animate-pulse`} />
          {statusCfg.label}
        </div>
      </div>

      {/* Price — always native format */}
      <div className="mb-1">
        <div className="text-2xl font-serif font-medium tabular-nums">
          {quote.available ? primaryPrice : "Live data temporarily unavailable"}
        </div>
        {/* Optional converted value for crypto/commodities */}
        {quote.available && convertedPrice && (
          <div className="text-xs text-muted-foreground tabular-nums mt-0.5">{convertedPrice}</div>
        )}
      </div>

      {/* Change */}
      {quote.available ? (
        <div className={`text-sm tabular-nums font-medium ${changeColor}`}>{changeText}</div>
      ) : null}

      {/* Footer: exchange + last updated + source */}
      {quote.available && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t rule">
          <span className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">{quote.exchange ?? "—"}</span>
          {quote.updated_at ? (
            <span className="text-[0.55rem] text-muted-foreground/70 tabular-nums">{formatTime(quote.updated_at, quote.market_timezone)}</span>
          ) : null}
        </div>
      )}
      {quote.available && quote.source && (
        <div className="text-[0.5rem] uppercase tracking-wider text-muted-foreground/40 mt-1">via {quote.source}</div>
      )}

      {showTip && quote.available && <Tooltip quote={quote} currency={currency} />}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border rule p-5 animate-pulse">
      <div className="h-4 w-24 bg-foreground/10 rounded mb-3" />
      <div className="h-8 w-32 bg-foreground/10 rounded mb-2" />
      <div className="h-4 w-28 bg-foreground/10 rounded" />
      <div className="h-3 w-20 bg-foreground/10 rounded mt-3" />
    </div>
  );
}

function CollapsibleGroup({ label, count, children, defaultOpen = true }: {
  label: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-baseline justify-between w-full border-b rule pb-2 mb-4 group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <h2 className="display-3">{label}</h2>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
        <span className="kicker">{count} instruments</span>
      </button>
      {open && children}
    </div>
  );
}

function MarketsPage() {
  const search = useSearch({ from: "/markets" });
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<Currency>("USD");

  useEffect(() => {
    try { const saved = localStorage.getItem("market-currency") as Currency | null; if (saved) setCurrency(saved); } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("market-currency", currency); } catch { /* ignore */ } }, [currency]);

  const { prices, loading, lastUpdate } = useMarketPrices(15_000);
  const activeAsset = search.asset;

  // News: only fetch financial categories — filter out promotional content
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const newsCategory = activeAsset ? getAssetNewsCategory(activeAsset) : "markets";

  const articlesQuery = useQuery(queryOptions({
    queryKey: ["markets-articles", activeAsset ?? "all"],
    queryFn: () => listArticles({ data: { limit: PAGE_SIZE, category: newsCategory } }),
    staleTime: 30_000,
  }));

  useEffect(() => {
    const result = articlesQuery.data as any;
    if (!result) return;
    const items = result.items ?? (Array.isArray(result) ? result : []);
    const filtered = filterFinancialNews(items);
    setArticles(filtered);
    offsetRef.current = items.length;
    setHasMore(result.hasMore ?? true);
  }, [articlesQuery.data]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const result = await listArticles({ data: { limit: PAGE_SIZE, offset: offsetRef.current, category: newsCategory } });
      const newItems = (result as any).items ?? [];
      const filtered = filterFinancialNews(newItems);
      if (filtered.length > 0) {
        setArticles((prev) => {
          const ids = new Set(prev.map((a) => a.id));
          return [...prev, ...filtered.filter((a: ArticleSummary) => !ids.has(a.id))];
        });
      }
      offsetRef.current += newItems.length;
      setHasMore((result as any).hasMore ?? false);
    } catch { setHasMore(false); }
    finally { setLoadingMore(false); isFetchingRef.current = false; }
  }, [hasMore, newsCategory]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && !loadingMore && hasMore) loadMore(); }, { rootMargin: "800px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loadingMore, hasMore]);

  function selectAsset(symbol: string) { navigate({ to: "/markets", search: { asset: symbol } }); }

  const cardVariants = { hidden: { opacity: 0, y: 24 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: Math.min(i % 6, 5) * 0.06 } }) };

  return (
    <div className="container-edit py-8 md:py-12">
      {/* Unified header — no duplicate "Live Markets" + "Live Global Markets" */}
      <header className="border-b rule pb-6 mb-8">
        <div className="kicker">Live Global Markets</div>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-3">
          <div>
            <h1 className="display-1">Markets</h1>
            <p className="dek mt-3 max-w-2xl">Real-time data from major global indices, commodities, forex, and crypto — with financial news from around the world.</p>
          </div>
          {/* Currency switcher — only affects crypto/commodity converted display */}
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Display Currency</label>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="appearance-none border rule bg-background px-4 py-2.5 pr-10 text-sm font-medium cursor-pointer hover:bg-muted/30 transition focus:outline-none focus:ring-2 focus:ring-foreground/40"
                aria-label="Select display currency"
              >
                {CURRENCY_OPTIONS.map((c) => (<option key={c.code} value={c.code}>{c.label}</option>))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs">▼</span>
            </div>
          </div>
        </div>
        {lastUpdate && (
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">Live</span><span>·</span>
            <span>Auto-refreshes every 15 seconds</span>
          </div>
        )}
      </header>

      {/* Asset filter bar */}
      {activeAsset && (
        <div className="mb-6 flex items-center gap-3 border rule p-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Filtered by</span>
          <span className="font-serif text-lg font-semibold">{prices.find((p) => p.symbol === activeAsset)?.name ?? activeAsset}</span>
          <button onClick={() => navigate({ to: "/markets", search: { asset: undefined } })} className="ml-auto inline-flex items-center gap-1 text-xs uppercase tracking-widest border rule px-3 py-1.5 hover:bg-foreground hover:text-background transition" aria-label="Clear asset filter">
            <X className="h-3 w-3" /> Clear filter
          </button>
        </div>
      )}

      {/* Unified dashboard — expandable categories, no duplicates */}
      <div className="space-y-8 mb-12">
        {prices.length === 0 && !loading && (
          <div className="text-center py-16 border rule">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="dek mb-2">Live market data is temporarily unavailable.</p>
            <p className="text-xs text-muted-foreground">Prices will appear automatically when the data feed reconnects.</p>
          </div>
        )}
        {MARKET_GROUPS_ORDER.map((group) => {
          const groupQuotes = prices.filter((q) =>
            group.categories.includes(q.category) && group.regions.includes(q.region ?? "")
          );
          if (groupQuotes.length === 0 && loading) {
            return (
              <CollapsibleGroup key={group.label} label={group.label} count={0}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              </CollapsibleGroup>
            );
          }
          if (groupQuotes.length === 0 && !loading) return null;
          return (
            <CollapsibleGroup key={group.label} label={group.label} count={groupQuotes.length}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : groupQuotes.map((q) => (
                    <MarketCard key={q.symbol} quote={q} currency={currency} isActive={activeAsset === q.symbol} onClick={() => selectAsset(q.symbol)} />
                  ))}
              </div>
            </CollapsibleGroup>
          );
        })}
      </div>

      {/* Currency explanation */}
      <div className="flex items-center gap-2 mb-12 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        <span>Indices shown in native points (pts). Forex shown as exchange rates. Crypto shown in USD with optional conversion. Display currency only converts crypto and commodities — indices and forex always show their native market value.</span>
      </div>

      {/* Market News — filtered to financial content only */}
      <div className="border-t rule pt-8">
        <div className="flex items-baseline justify-between border-b rule pb-3 mb-8">
          <h2 className="display-3">Market News</h2>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="kicker">{activeAsset ? `Filtered: ${prices.find((p) => p.symbol === activeAsset)?.name ?? activeAsset}` : "Financial news"}</span>
          </div>
        </div>

        {articles.length > 0 && (
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => (
              <motion.div key={article.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <ArticleCard article={article} variant="default" />
              </motion.div>
            ))}
          </div>
        )}

        {articles.length === 0 && !articlesQuery.isLoading && !articlesQuery.isError && (
          <p className="dek text-center py-12">No financial news found right now.</p>
        )}
        {articlesQuery.isLoading && articles.length === 0 && <ArticleCardSkeletonGrid count={6} />}
        {articlesQuery.isError && (
          <p className="dek text-center py-12">Could not load news. {(articlesQuery.error as Error)?.message}</p>
        )}

        <div ref={sentinelRef} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}
      </div>

      <ScrollToTop />
    </div>
  );
}

// Map asset symbols to news categories for filtering
function getAssetNewsCategory(symbol: string): string {
  const map: Record<string, string> = {
    SENSEX: "markets", NIFTY50: "markets", BANKNIFTY: "markets", NIFTYIT: "technology",
    DJI: "markets", SPX: "markets", IXIC: "technology",
    FTSE100: "markets", DAX: "markets", CAC40: "markets",
    N225: "markets", HSI: "markets", SSEC: "markets",
    GOLD: "investing", SILVER: "investing", BRENT: "markets", WTI: "markets", NATGAS: "markets",
    USDINR: "economics", EURUSD: "economics", GBPUSD: "economics", USDJPY: "economics",
    BTC: "technology", ETH: "technology",
  };
  return map[symbol] ?? "markets";
}

// Filter out promotional/non-financial content from news feed
const PROMO_PATTERNS = /\b(sponsored|promoted|advertisement|promo|sponsored content|paid post|brand content|press release|advertising feature|guest post|real estate listing|property listing|travel deal|wellness tip|product launch announcement|exclusive offer|limited time|discount code|coupon|buy now|shop now|free trial|giveaway|contest|sweepstakes|sign up for our|newsletter signup|download our app|subscribe to our)\b/i;

// Content-farm boilerplate — e.g. "Konexio Network helps our society with the daily business news..."
const CONTENT_FARM_BOILERPLATE = /konexio network helps our society|helps our society with the daily business|corporate interview,? article on market|article on market and general article|which help our readers|daily business news updates/i;

const FINANCIAL_KEYWORDS = /\b(stock|market|index|indices|nifty|sensex|dow jones|nasdaq|s&p|sp500|ftse|dax|cac|nikkei|hang seng|shanghai|bitcoin|ethereum|crypto|cryptocurrency|gold|silver|oil|crude|brent|wti|natural gas|commodity|commodities|forex|currency|exchange rate|inflation|gdp|interest rate|federal reserve|fed|rbi|ecb|central bank|earnings|revenue|profit|loss|quarterly|fiscal|treasury|bond|yield|trade|tariff|recession|economy|economic|merger|acquisition|ipo|nasdaq|nyse|bse|nse|sec|sebi|bull|bear|rally|correction|volatility|portfolio|hedge|dividend|market cap|price target|analyst|upgrade|downgrade|rating|outlook|forecast|guidance)\b/i;

function filterFinancialNews(items: ArticleSummary[]): ArticleSummary[] {
  return items.filter((article) => {
    const text = `${article.title ?? ""} ${article.dek ?? ""} ${article.category ?? ""}`.toLowerCase();
    // Always exclude promotional content
    if (PROMO_PATTERNS.test(text)) return false;
    // Always exclude content-farm boilerplate (Konexio etc.)
    if (CONTENT_FARM_BOILERPLATE.test(text)) return false;
    // Include if it has financial keywords or is in a financial category
    if (FINANCIAL_KEYWORDS.test(text)) return true;
    // Include if category is financial
    if (FINANCIAL_CATEGORIES.includes(article.category ?? "")) return true;
    // Exclude everything else
    return false;
  });
}
