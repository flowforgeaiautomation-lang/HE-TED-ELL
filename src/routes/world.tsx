import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, X, Globe2, Users, TrendingUp, Building2, BarChart3, ExternalLink, Loader2 } from "lucide-react";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";
import { getNorwayStats } from "@/lib/ssb.functions";

export const Route = createFileRoute("/world")({
  component: WorldPage,
  head: () => ({
    meta: [
      { title: "World — The United Hell" },
      { name: "description", content: "Explore humanity, discovery, history, nature, science, innovation, and important events from every corner of Earth." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "World — The United Hell" },
      { property: "og:description", content: "Explore humanity, discovery, history, nature, science, innovation, and important events from every corner of Earth." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/world") },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "World — The United Hell" },
      { name: "twitter:description", content: "Explore humanity, discovery, history, nature, science, innovation, and important events from every corner of Earth." },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/world") },
    ],
  }),
});

interface CountryInfo {
  name: string;
  iso2: string;
  iso3: string;
  countryCode: string;
  flag: string;
  region: string;
  subregion: string;
  currency: string;
  currencyName: string;
  languages: string[];
  hasStats?: boolean;
}

const COUNTRY_DATA: Record<string, CountryInfo> = {
  Norway: {
    name: "Norway", iso2: "NO", iso3: "NOR", countryCode: "578", flag: "🇳🇴",
    region: "Europe", subregion: "Northern Europe", currency: "NOK", currencyName: "Norwegian krone",
    languages: ["nb", "nn"], hasStats: true,
  },
  India: {
    name: "India", iso2: "IN", iso3: "IND", countryCode: "356", flag: "🇮🇳",
    region: "Asia", subregion: "Southern Asia", currency: "INR", currencyName: "Indian rupee",
    languages: ["hi", "en"],
  },
  "United States": {
    name: "United States", iso2: "US", iso3: "USA", countryCode: "840", flag: "🇺🇸",
    region: "North America", subregion: "Northern America", currency: "USD", currencyName: "United States dollar",
    languages: ["en"],
  },
  "United Kingdom": {
    name: "United Kingdom", iso2: "GB", iso3: "GBR", countryCode: "826", flag: "🇬🇧",
    region: "Europe", subregion: "Northern Europe", currency: "GBP", currencyName: "Pound sterling",
    languages: ["en"],
  },
  France: {
    name: "France", iso2: "FR", iso3: "FRA", countryCode: "250", flag: "🇫🇷",
    region: "Europe", subregion: "Western Europe", currency: "EUR", currencyName: "Euro",
    languages: ["fr"],
  },
  Germany: {
    name: "Germany", iso2: "DE", iso3: "DEU", countryCode: "276", flag: "🇩🇪",
    region: "Europe", subregion: "Western Europe", currency: "EUR", currencyName: "Euro",
    languages: ["de"],
  },
  Japan: {
    name: "Japan", iso2: "JP", iso3: "JPN", countryCode: "392", flag: "🇯🇵",
    region: "Asia", subregion: "Eastern Asia", currency: "JPY", currencyName: "Japanese yen",
    languages: ["ja"],
  },
  "South Korea": {
    name: "South Korea", iso2: "KR", iso3: "KOR", countryCode: "410", flag: "🇰🇷",
    region: "Asia", subregion: "Eastern Asia", currency: "KRW", currencyName: "South Korean won",
    languages: ["ko"],
  },
  Brazil: {
    name: "Brazil", iso2: "BR", iso3: "BRA", countryCode: "076", flag: "🇧🇷",
    region: "South America", subregion: "South America", currency: "BRL", currencyName: "Brazilian real",
    languages: ["pt"],
  },
  Spain: {
    name: "Spain", iso2: "ES", iso3: "ESP", countryCode: "724", flag: "🇪🇸",
    region: "Europe", subregion: "Southern Europe", currency: "EUR", currencyName: "Euro",
    languages: ["es"],
  },
  Italy: {
    name: "Italy", iso2: "IT", iso3: "ITA", countryCode: "380", flag: "🇮🇹",
    region: "Europe", subregion: "Southern Europe", currency: "EUR", currencyName: "Euro",
    languages: ["it"],
  },
  China: {
    name: "China", iso2: "CN", iso3: "CHN", countryCode: "156", flag: "🇨🇳",
    region: "Asia", subregion: "Eastern Asia", currency: "CNY", currencyName: "Chinese yuan",
    languages: ["zh"],
  },
  Canada: {
    name: "Canada", iso2: "CA", iso3: "CAN", countryCode: "124", flag: "🇨🇦",
    region: "North America", subregion: "Northern America", currency: "CAD", currencyName: "Canadian dollar",
    languages: ["en", "fr"],
  },
  Australia: {
    name: "Australia", iso2: "AU", iso3: "AUS", countryCode: "036", flag: "🇦🇺",
    region: "Oceania", subregion: "Australia and New Zealand", currency: "AUD", currencyName: "Australian dollar",
    languages: ["en"],
  },
  Sweden: {
    name: "Sweden", iso2: "SE", iso3: "SWE", countryCode: "752", flag: "🇸🇪",
    region: "Europe", subregion: "Northern Europe", currency: "SEK", currencyName: "Swedish krona",
    languages: ["sv"],
  },
  Denmark: {
    name: "Denmark", iso2: "DK", iso3: "DNK", countryCode: "208", flag: "🇩🇰",
    region: "Europe", subregion: "Northern Europe", currency: "DKK", currencyName: "Danish krone",
    languages: ["da"],
  },
  Finland: {
    name: "Finland", iso2: "FI", iso3: "FIN", countryCode: "246", flag: "🇫🇮",
    region: "Europe", subregion: "Northern Europe", currency: "EUR", currencyName: "Euro",
    languages: ["fi"],
  },
  Iceland: {
    name: "Iceland", iso2: "IS", iso3: "ISL", countryCode: "352", flag: "🇮🇸",
    region: "Europe", subregion: "Northern Europe", currency: "ISK", currencyName: "Icelandic króna",
    languages: ["is"],
  },
  Netherlands: {
    name: "Netherlands", iso2: "NL", iso3: "NLD", countryCode: "528", flag: "🇳🇱",
    region: "Europe", subregion: "Western Europe", currency: "EUR", currencyName: "Euro",
    languages: ["nl"],
  },
  Switzerland: {
    name: "Switzerland", iso2: "CH", iso3: "CHE", countryCode: "756", flag: "🇨🇭",
    region: "Europe", subregion: "Western Europe", currency: "CHF", currencyName: "Swiss franc",
    languages: ["de", "fr", "it"],
  },
  Russia: {
    name: "Russia", iso2: "RU", iso3: "RUS", countryCode: "643", flag: "🇷🇺",
    region: "Europe", subregion: "Eastern Europe", currency: "RUB", currencyName: "Russian ruble",
    languages: ["ru"],
  },
  Turkey: {
    name: "Turkey", iso2: "TR", iso3: "TUR", countryCode: "792", flag: "🇹🇷",
    region: "Asia", subregion: "Western Asia", currency: "TRY", currencyName: "Turkish lira",
    languages: ["tr"],
  },
  Mexico: {
    name: "Mexico", iso2: "MX", iso3: "MEX", countryCode: "484", flag: "🇲🇽",
    region: "North America", subregion: "Central America", currency: "MXN", currencyName: "Mexican peso",
    languages: ["es"],
  },
  "South Africa": {
    name: "South Africa", iso2: "ZA", iso3: "ZAF", countryCode: "710", flag: "🇿🇦",
    region: "Africa", subregion: "Southern Africa", currency: "ZAR", currencyName: "South African rand",
    languages: ["en"],
  },
  Egypt: {
    name: "Egypt", iso2: "EG", iso3: "EGY", countryCode: "818", flag: "🇪🇬",
    region: "Africa", subregion: "Northern Africa", currency: "EGP", currencyName: "Egyptian pound",
    languages: ["ar"],
  },
  "Saudi Arabia": {
    name: "Saudi Arabia", iso2: "SA", iso3: "SAU", countryCode: "682", flag: "🇸🇦",
    region: "Asia", subregion: "Western Asia", currency: "SAR", currencyName: "Saudi riyal",
    languages: ["ar"],
  },
  Indonesia: {
    name: "Indonesia", iso2: "ID", iso3: "IDN", countryCode: "360", flag: "🇮🇩",
    region: "Asia", subregion: "South-Eastern Asia", currency: "IDR", currencyName: "Indonesian rupiah",
    languages: ["id"],
  },
  Portugal: {
    name: "Portugal", iso2: "PT", iso3: "PRT", countryCode: "620", flag: "🇵🇹",
    region: "Europe", subregion: "Southern Europe", currency: "EUR", currencyName: "Euro",
    languages: ["pt"],
  },
  Poland: {
    name: "Poland", iso2: "PL", iso3: "POL", countryCode: "616", flag: "🇵🇱",
    region: "Europe", subregion: "Central Europe", currency: "PLN", currencyName: "Polish złoty",
    languages: ["pl"],
  },
  Ukraine: {
    name: "Ukraine", iso2: "UA", iso3: "UKR", countryCode: "804", flag: "🇺🇦",
    region: "Europe", subregion: "Eastern Europe", currency: "UAH", currencyName: "Ukrainian hryvnia",
    languages: ["uk"],
  },
  Israel: {
    name: "Israel", iso2: "IL", iso3: "ISR", countryCode: "376", flag: "🇮🇱",
    region: "Asia", subregion: "Western Asia", currency: "ILS", currencyName: "Israeli new shekel",
    languages: ["he"],
  },
  Thailand: {
    name: "Thailand", iso2: "TH", iso3: "THA", countryCode: "764", flag: "🇹🇭",
    region: "Asia", subregion: "South-Eastern Asia", currency: "THB", currencyName: "Thai baht",
    languages: ["th"],
  },
  Vietnam: {
    name: "Vietnam", iso2: "VN", iso3: "VNM", countryCode: "704", flag: "🇻🇳",
    region: "Asia", subregion: "South-Eastern Asia", currency: "VND", currencyName: "Vietnamese đồng",
    languages: ["vi"],
  },
};

const continents = [
  {
    name: "Asia", countries: ["China", "India", "Japan", "South Korea", "Indonesia", "Vietnam", "Thailand", "Singapore", "Malaysia", "Philippines", "Mongolia", "Nepal", "Bhutan", "Bangladesh", "Sri Lanka", "Maldives", "Myanmar", "Laos", "Cambodia", "North Korea", "Pakistan", "Afghanistan", "Iran", "Iraq", "Jordan", "Israel", "Lebanon", "Syria", "Turkey", "Cyprus", "Georgia", "Armenia", "Azerbaijan", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan"], countryCount: 48
  },
  {
    name: "Europe", countries: ["France", "Germany", "Italy", "Spain", "United Kingdom", "Portugal", "Netherlands", "Belgium", "Luxembourg", "Switzerland", "Austria", "Hungary", "Czech Republic", "Slovakia", "Poland", "Lithuania", "Latvia", "Estonia", "Finland", "Sweden", "Norway", "Denmark", "Iceland", "Ireland", "Greece", "Croatia", "Serbia", "Bosnia and Herzegovina", "Slovenia", "North Macedonia", "Albania", "Bulgaria", "Romania", "Moldova", "Ukraine", "Belarus", "Russia", "Montenegro", "Kosovo"], countryCount: 44
  },
  {
    name: "Africa", countries: ["Nigeria", "Ethiopia", "Egypt", "South Africa", "Kenya", "Tanzania", "Morocco", "Algeria", "Tunisia", "Ghana", "Ivory Coast", "Senegal", "Cameroon", "Uganda", "Rwanda", "Burundi", "Mozambique", "Zimbabwe", "Botswana", "Namibia", "Angola", "Zambia", "Malawi", "Lesotho", "Eswatini", "Madagascar", "Mauritius", "Seychelles", "Comoros", "Djibouti", "Somalia", "Eritrea", "Sudan", "South Sudan", "Chad", "Central African Republic", "Republic of the Congo", "Democratic Republic of the Congo", "Gabon", "Equatorial Guinea", "São Tomé and Príncipe", "Cape Verde", "Gambia", "Sierra Leone", "Liberia", "Guinea", "Guinea-Bissau", "Mali", "Burkina Faso", "Niger", "Benin", "Togo"], countryCount: 54
  },
  {
    name: "North America", countries: ["United States", "Canada", "Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama", "Cuba", "Dominican Republic", "Haiti", "Jamaica", "Trinidad and Tobago", "Barbados", "Saint Lucia", "Grenada", "Saint Vincent and the Grenadines", "Antigua and Barbuda", "Saint Kitts and Nevis", "Dominica", "Bahamas"], countryCount: 23
  },
  {
    name: "South America", countries: ["Brazil", "Argentina", "Peru", "Colombia", "Chile", "Ecuador", "Venezuela", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname", "French Guiana"], countryCount: 12
  },
  {
    name: "Oceania", countries: ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Solomon Islands", "Vanuatu", "Samoa", "Tonga", "Tuvalu", "Kiribati", "Marshall Islands", "Palau", "Nauru", "Federated States of Micronesia"], countryCount: 14
  },
  {
    name: "Antarctica", countries: [], countryCount: 0
  },
];

const rankings = [
  { title: "Most Innovative Countries", items: ["Japan", "South Korea", "Germany", "Switzerland", "Sweden"] },
  { title: "Most Visited Countries", items: ["France", "Spain", "United States", "Italy", "Turkey"] },
  { title: "Richest Countries", items: ["Luxembourg", "Singapore", "Ireland", "Qatar", "Switzerland"] },
  { title: "Fastest Growing Economies", items: ["India", "China", "Vietnam", "Indonesia", "Philippines"] },
  { title: "Most Sustainable Countries", items: ["Iceland", "Denmark", "Sweden", "Norway", "Finland"] },
];

const discoverCollections = [
  { title: "Hidden Places Of Earth", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1000&auto=format&fit=crop" },
  { title: "Most Beautiful Rivers", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop" },
  { title: "Greatest Ancient Civilizations", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1000&auto=format&fit=crop" },
  { title: "Largest Forests", image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1000&auto=format&fit=crop" },
];

const todayDiscoveryFacts = [
  "Home to the world's oldest continuously inhabited city: Varanasi, India (over 3,000+ years",
  "Invented the number zero and decimal system",
  "Has 38 UNESCO World Heritage Sites",
  "World's largest producer of milk",
  "More than 19,500 languages spoken",
  "Largest democracy on Earth with 900 million+ voters",
  "Invented chess (Chaturanga) around 6th century",
  "World's highest cricket team won 1983 & 2011 World Cups",
  "Bollywood produces 2,000+ films yearly",
  "Home to Bengal tigers, Asiatic lions",
];

function NorwayStatsPanel() {
  const fetchStats = useServerFn(getNorwayStats);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchStats({ data: {} });
        if (cancelled) return;
        if (result.ok && result.stats) {
          setStats(result.stats);
        } else {
          setError(result.error || "Failed to load statistics");
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Loading live statistics from Statistics Norway…</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Statistics are temporarily unavailable. The rest of the page continues to work.
        </p>
      </div>
    );
  }

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  const statItems: { label: string; value: string; icon: typeof Users }[] = [];
  if (stats.population) statItems.push({ label: "Population", value: formatNum(stats.population), icon: Users });
  if (stats.births) statItems.push({ label: "Births", value: formatNum(stats.births), icon: Users });
  if (stats.deaths) statItems.push({ label: "Deaths", value: formatNum(stats.deaths), icon: Users });
  if (stats.immigration) statItems.push({ label: "Immigration", value: formatNum(stats.immigration), icon: Users });
  if (stats.emigration) statItems.push({ label: "Emigration", value: formatNum(stats.emigration), icon: Users });
  if (stats.netMigration) statItems.push({ label: "Net Migration", value: formatNum(stats.netMigration), icon: TrendingUp });
  if (stats.employed) statItems.push({ label: "Employed", value: formatNum(stats.employed), icon: Building2 });
  if (stats.unemployed) statItems.push({ label: "Unemployed", value: formatNum(stats.unemployed), icon: TrendingUp });

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statItems.map((item, i) => (
          <div key={i} className="border border-rule p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <item.icon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-widest">{item.label}</span>
            </div>
            <div className="font-serif text-2xl">{item.value}</div>
          </div>
        ))}
      </div>

      {stats.tables && stats.tables.length > 0 && (
        <div className="mt-6 pt-4 border-t rule">
          <div className="text-xs text-muted-foreground mb-2">Data sourced from:</div>
          <ul className="space-y-1">
            {stats.tables.map((t: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <BarChart3 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 pt-4 border-t rule flex items-center gap-2 text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        <span>Source: <a href="https://www.ssb.no/en/statbank" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Statistics Norway (SSB)</a></span>
      </div>
    </div>
  );
}

function CountryDetailModal({ country, onClose }: { country: CountryInfo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-rule max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b rule sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{country.flag}</span>
            <div>
              <h2 className="font-serif text-3xl">{country.name}</h2>
              <div className="text-sm text-muted-foreground">
                {country.region} · {country.subregion}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/10 rounded-sm transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Country Facts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-rule p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">ISO Code</div>
              <div className="font-serif text-lg">{country.iso2} / {country.iso3}</div>
            </div>
            <div className="border border-rule p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Country Code</div>
              <div className="font-serif text-lg">{country.countryCode}</div>
            </div>
            <div className="border border-rule p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Currency</div>
              <div className="font-serif text-lg">{country.currency}</div>
              <div className="text-xs text-muted-foreground">{country.currencyName}</div>
            </div>
            <div className="border border-rule p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Languages</div>
              <div className="font-serif text-lg">{country.languages.join(", ")}</div>
            </div>
          </div>

          {/* SSB Statistics for Norway */}
          {country.hasStats && country.iso2 === "NO" && (
            <div>
              <div className="kicker mb-4">Live Statistics from Statistics Norway (SSB)</div>
              <NorwayStatsPanel />
            </div>
          )}

          {/* News + Search */}
          <div className="space-y-4">
            <div>
              <div className="kicker mb-4">News from {country.name}</div>
              <Link
                to="/"
                search={{ country: country.iso2 }}
                className="inline-flex items-center gap-2 border border-rule px-4 py-2 text-sm hover:bg-foreground hover:text-background transition"
              >
                <Globe2 className="h-4 w-4" />
                View {country.name} news feed
              </Link>
            </div>
            <div>
              <div className="kicker mb-4">Related Coverage</div>
              <Link
                to="/search"
                search={{ q: country.name }}
                className="inline-flex items-center gap-2 border border-rule px-4 py-2 text-sm hover:bg-foreground hover:text-background transition"
              >
                <Search className="h-4 w-4" />
                Search articles about {country.name}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorldPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [selectedContinent, setSelectedContinent] = useState<typeof continents[0] | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);

  const filterText = (text: string, query: string) =>
    text.toLowerCase().includes(query.toLowerCase().trim());

  const allCountries = continents.flatMap((c) => c.countries);

  const filteredContinents = searchQuery.trim()
    ? continents.filter((c) =>
        filterText(c.name, searchQuery) ||
        c.countries.some((country) => filterText(country, searchQuery))
      )
    : continents;

  const filteredCountries = searchQuery.trim()
    ? allCountries.filter((c) => filterText(c, searchQuery)).sort()
    : [];

  const filteredRankings = searchQuery.trim()
    ? rankings.filter(
        (r) =>
          filterText(r.title, searchQuery) ||
          r.items.some((item) => filterText(item, searchQuery))
      )
    : rankings;

  const filteredCollections = searchQuery.trim()
    ? discoverCollections.filter((c) => filterText(c.title, searchQuery))
    : discoverCollections;

  const handleCountryClick = (country: string) => {
    const info = COUNTRY_DATA[country];
    if (info) {
      setSelectedCountry(info);
      setSelectedContinent(null);
    } else {
      // For countries without detailed data, go to search
      window.location.href = `/search?q=${encodeURIComponent(country)}`;
    }
  };

  const nextFact = () => {
    setCurrentFactIndex((prev) => (prev + 1) % todayDiscoveryFacts.length);
  };

  const prevFact = () => {
    setCurrentFactIndex((prev) => (prev - 1 + todayDiscoveryFacts.length) % todayDiscoveryFacts.length);
  };

  return (
    <div className="container-edit py-10 md:py-16">
      {/* Header */}
      <header className="text-center pb-16 border-b rule">
        <div className="kicker">World</div>
        <h1 className="display-1 mt-3">Explore humanity, discovery, history, nature, science, innovation, and important events from every corner of Earth.</h1>
        <div className="mt-10 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search countries, cities, cultures, discoveries, news, wildlife..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-transparent border border-rule text-lg font-serif outline-none focus:border-foreground"
            />
          </div>
        </div>
      </header>

      {/* Featured Countries */}
      <section className="py-12 border-b rule">
        <div className="text-center mb-10">
          <div className="kicker">Featured Countries</div>
          <p className="font-serif text-lg mt-2">Click a country to explore detailed information and live statistics</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(COUNTRY_DATA).map((country) => (
            <button
              key={country.iso2}
              onClick={() => setSelectedCountry(country)}
              className="p-6 border border-rule text-left hover:bg-foreground hover:text-background transition group"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">{country.flag}</span>
                <div>
                  <div className="font-serif text-2xl mb-1">{country.name}</div>
                  <div className="text-sm text-muted-foreground group-hover:text-background/70">
                    {country.subregion} · {country.currency}
                  </div>
                  {country.hasStats && (
                    <div className="text-xs mt-1 text-muted-foreground group-hover:text-background/60 flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      Live statistics available
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Search Results (if query exists) */}
      {searchQuery.trim() && filteredCountries.length > 0 && (
        <section className="py-12 border-b rule">
          <div className="text-center mb-10">
            <div className="kicker">Search Results</div>
            <p className="font-serif text-lg mt-2">Found {filteredCountries.length} matching countries</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredCountries.map((country) => (
              <button
                key={country}
                onClick={() => handleCountryClick(country)}
                className="border border-rule p-4 text-left font-serif hover:bg-foreground hover:text-background transition flex items-center gap-2"
              >
                {COUNTRY_DATA[country]?.flag && <span className="text-xl">{COUNTRY_DATA[country].flag}</span>}
                {country}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Continents */}
      <section className="py-12 border-b rule">
        <div className="text-center mb-10">
          <div className="kicker">Explore By Continent</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContinents.map((continent) => (
          <button
            key={continent.name}
            onClick={() => setSelectedContinent(continent)}
            className="p-6 border border-rule text-left hover:bg-foreground hover:text-background transition text-left"
          >
            <div className="font-serif text-2xl mb-2">{continent.name}</div>
            <div className="text-sm text-muted-foreground hover:text-background/70">{continent.countryCount} Countries</div>
          </button>
          ))}
        </div>
      </section>

      {/* Global Rankings */}
      <section className="py-12 border-b rule">
        <div className="text-center mb-10">
          <div className="kicker">Global Rankings</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRankings.map((ranking) => (
            <div key={ranking.title} className="border border-rule p-6">
              <h3 className="font-serif text-xl mb-4">{ranking.title}</h3>
              <ol className="space-y-2 font-serif">
                {ranking.items.map((item, i) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-6">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Discover Earth Collections */}
      <section className="py-12 border-b rule">
        <div className="text-center mb-10">
          <div className="kicker">Discover Earth</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCollections.map((collection) => (
            <button key={collection.title} className="group text-left">
              <div className="aspect-video bg-muted/30 border border-rule overflow-hidden">
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                />
              </div>
              <div className="mt-4 font-serif text-xl">{collection.title}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Today's Discovery */}
      <section className="py-12">
        <div className="text-center mb-10">
          <div className="kicker">Today's Discovery</div>
        </div>
        <div className="border border-rule p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2">
              <div className="aspect-square bg-muted/30 border border-rule overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=1000&auto=format&fit=crop"
                  alt="India"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="kicker">India</div>
              <h2 className="display-1 mt-3">The World's Largest Democracy</h2>
              <div className="mt-6 font-serif text-lg">
                <p className="mb-4">Amazing Fact {currentFactIndex + 1} of {todayDiscoveryFacts.length}:</p>
                <div className="min-h-[100px flex items-center">
                  <p className="leading-relaxed">{todayDiscoveryFacts[currentFactIndex]}</p>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={prevFact} className="border border-rule px-4 py-2 text-sm hover:bg-foreground hover:text-background transition">← Previous</button>
                  <button onClick={nextFact} className="border border-rule px-4 py-2 text-sm hover:bg-foreground hover:text-background transition">Next →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Continent Popup */}
      {selectedContinent && !selectedCountry && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-rule max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b rule">
              <h2 className="font-serif text-3xl">{selectedContinent.name}</h2>
              <button onClick={() => setSelectedContinent(null)} className="p-2">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {selectedContinent.countries.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedContinent.countries.map((country) => (
                    <button
                      key={country}
                      onClick={() => handleCountryClick(country)}
                      className="font-serif text-lg border border-rule px-3 py-2 hover:bg-foreground hover:text-background transition text-left flex items-center gap-2"
                    >
                      {COUNTRY_DATA[country]?.flag && <span className="text-lg">{COUNTRY_DATA[country].flag}</span>}
                      {country}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="font-serif text-lg text-muted-foreground">
                  No sovereign nations — a continent dedicated to science and exploration.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Country Detail Modal */}
      {selectedCountry && (
        <CountryDetailModal country={selectedCountry} onClose={() => setSelectedCountry(null)} />
      )}
    </div>
  );
}
