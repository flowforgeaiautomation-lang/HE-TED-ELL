import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Globe, Check, X, Loader2, ChevronDown, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { translateArticle, getTranslationHealth } from "@/lib/translation.functions";

async function clientTranslateText(text: string, target: string): Promise<string | null> {
  try {
    const truncated = text.slice(0, 4500);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(truncated)}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d) || !Array.isArray(d[0])) return null;
    const translated = (d[0] as any[][])
      .map((seg) => (Array.isArray(seg) && seg[0]) ? seg[0] : "")
      .join("");
    return (translated && translated.trim() && translated !== text) ? translated : null;
  } catch {
    return null;
  }
}

async function clientTranslateBatch(texts: string[], target: string): Promise<string[]> {
  const results = await Promise.all(texts.map((t) => clientTranslateText(t, target)));
  return results.map((r, i) => r ?? texts[i]);
}

function hasChanged(results: string[], originals: string[]): boolean {
  let changed = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i] && results[i].trim() && results[i] !== originals[i]) changed++;
  }
  return changed >= Math.ceil(results.length * 0.3);
}

interface LangInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

// Complete fallback list — used immediately, replaced by server data when it loads
const FALLBACK_LANGUAGES: LangInfo[] = [
  { code: "nb", name: "Norwegian Bokmål", nativeName: "Bokmål", flag: "🇳🇴" },
  { code: "nn", name: "Norwegian Nynorsk", nativeName: "Nynorsk", flag: "🇳🇴" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", flag: "🇮🇳" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्", flag: "🇮🇳" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska", flag: "🇮🇸" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦" },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", flag: "🇭🇺" },
  { code: "ro", name: "Romanian", nativeName: "Română", flag: "🇷🇴" },
  { code: "bg", name: "Bulgarian", nativeName: "Български", flag: "🇧🇬" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", flag: "🇭🇷" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina", flag: "🇸🇮" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu", flag: "🇱🇻" },
  { code: "et", name: "Estonian", nativeName: "Eesti", flag: "🇪🇪" },
  { code: "fa", name: "Persian", nativeName: "فارسی", flag: "🇮🇷" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tl", name: "Filipino", nativeName: "Filipino", flag: "🇵🇭" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans", flag: "🇿🇦" },
  { code: "sq", name: "Albanian", nativeName: "Shqip", flag: "🇦🇱" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan", flag: "🇦🇿" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская", flag: "🇧🇾" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski", flag: "🇧🇦" },
  { code: "ca", name: "Catalan", nativeName: "Català", flag: "🇪🇸" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg", flag: "🏴" },
  { code: "eo", name: "Esperanto", nativeName: "Esperanto", flag: "🌍" },
  { code: "eu", name: "Basque", nativeName: "Euskara", flag: "🇪🇸" },
  { code: "gl", name: "Galician", nativeName: "Galego", flag: "🇪🇸" },
  { code: "ka", name: "Georgian", nativeName: "ქართული", flag: "🇬🇪" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge", flag: "🇮🇪" },
  { code: "la", name: "Latin", nativeName: "Latina", flag: "🇻🇦" },
  { code: "lb", name: "Luxembourgish", nativeName: "Lëtzebuergesch", flag: "🇱🇺" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски", flag: "🇲🇰" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол", flag: "🇲🇳" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", flag: "🇳🇵" },
  { code: "ps", name: "Pashto", nativeName: "پښتو", flag: "🇦🇫" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", flag: "🇵🇰" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල", flag: "🇱🇰" },
  { code: "sr", name: "Serbian", nativeName: "Српски", flag: "🇷🇸" },
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ", flag: "🇹🇯" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbek", flag: "🇺🇿" },
  { code: "yi", name: "Yiddish", nativeName: "ייִדיש", flag: "🇮🇱" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu", flag: "🇿🇦" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa", flag: "🇿🇦" },
  { code: "st", name: "Southern Sotho", nativeName: "Sesotho", flag: "🇿🇦" },
  { code: "sn", name: "Shona", nativeName: "chiShona", flag: "🇿🇼" },
  { code: "so", name: "Somali", nativeName: "Soomaali", flag: "🇸🇴" },
  { code: "tk", name: "Turkmen", nativeName: "Türkmen", flag: "🇹🇲" },
  { code: "tt", name: "Tatar", nativeName: "Татар", flag: "🇷🇺" },
  { code: "ug", name: "Uyghur", nativeName: "ئۇيغۇر", flag: "🇨🇳" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá", flag: "🇳🇬" },
];

export interface ArticleTranslateState {
  language: string;
  title: string;
  dek?: string;
  body?: string;
  story?: any;
}

interface Props {
  slug: string;
  originalTitle: string;
  originalDek?: string;
  originalBody?: string;
  originalStory?: any;
  onTranslate: (state: ArticleTranslateState | null) => void;
}

export function ArticleTranslateControl({ slug, originalTitle, originalDek, originalBody, originalStory, onTranslate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const translate = useServerFn(translateArticle);
  const checkHealth = useServerFn(getTranslationHealth);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch language list from server on mount (non-blocking)
  const [serverLanguages, setServerLanguages] = useState<LangInfo[] | null>(null);
  useEffect(() => {
    checkHealth()
      .then((result: any) => {
        if (result?.languages && Array.isArray(result.languages) && result.languages.length > 0) {
          setServerLanguages(result.languages);
        }
      })
      .catch(() => {});
  }, [checkHealth]);

  const languages = useMemo(() => serverLanguages ?? FALLBACK_LANGUAGES, [serverLanguages]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return languages;
    const q = searchQuery.toLowerCase();
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [languages, searchQuery]);

  const handleSelect = useCallback(
    async (langCode: string) => {
      if (langCode === "en") {
        setActiveLang(null);
        onTranslate(null);
        setOpen(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setOpen(false);

      const stringKeys = [
        "summary", "main_story", "background", "bigger_picture", "did_you_know",
        "why_it_matters", "expert_analysis", "historical_context", "future_outlook",
        "what_happens_next", "what_happened", "how_it_happened", "who_and_where",
        "what_came_before",
      ];
      const arrayKeys = [
        "reader_takeaways", "key_developments", "timeline", "tags", "quick_insights",
        "key_facts",
      ];

      const story = originalStory && typeof originalStory === "object" ? originalStory as Record<string, any> : null;
      const storyTexts: string[] = [];
      if (story) {
        for (const key of stringKeys) {
          if (story[key] && typeof story[key] === "string") storyTexts.push(story[key]);
        }
        for (const key of arrayKeys) {
          if (Array.isArray(story[key])) storyTexts.push(...story[key].filter((x: any) => typeof x === "string"));
        }
      }
      const allTexts = [originalTitle, originalDek, originalBody, ...storyTexts].filter(Boolean) as string[];

      let translated: string[] | null = null;

      // Try client-side Google Translate first (works from browser, no API key needed)
      try {
        const clientResults = await clientTranslateBatch(allTexts, langCode);
        if (hasChanged(clientResults, allTexts)) translated = clientResults;
      } catch { /* fall through to server */ }

      // Fall back to server-side translation if client-side failed
      if (!translated) {
        try {
          const result = await translate({
            data: {
              slug,
              target: langCode,
              title: originalTitle,
              dek: originalDek,
              body: originalBody,
              story: originalStory,
            },
          });
          if (result && !result.error && result.title) {
            setActiveLang(langCode);
            onTranslate({
              language: langCode,
              title: result.title,
              dek: result.dek,
              body: result.body,
              story: result.story,
            });
            return;
          }
        } catch { /* both failed */ }
      }

      if (translated) {
        let idx = 0;
        const tTitle = translated[idx++] || originalTitle;
        const tDek = originalDek ? (translated[idx++] || originalDek) : undefined;
        const tBody = originalBody ? (translated[idx++] || originalBody) : undefined;
        const tStoryTexts = translated.slice(idx);
        let sIdx = 0;
        const tStory = originalStory ? JSON.parse(JSON.stringify(originalStory)) : undefined;
        if (tStory && typeof tStory === "object") {
          for (const key of stringKeys) {
            if (tStory[key] && typeof tStory[key] === "string") {
              tStory[key] = tStoryTexts[sIdx++] || tStory[key];
            }
          }
          for (const key of arrayKeys) {
            if (Array.isArray(tStory[key])) {
              tStory[key] = tStory[key].map((item: any) =>
                typeof item === "string" ? (tStoryTexts[sIdx++] || item) : item
              );
            }
          }
        }
        setActiveLang(langCode);
        onTranslate({ language: langCode, title: tTitle, dek: tDek, body: tBody, story: tStory });
      } else {
        setError("Translation unavailable for this language. Please try another.");
        setTimeout(() => setError(null), 4000);
      }
      setLoading(false);
    },
    [slug, originalTitle, originalDek, originalBody, originalStory, onTranslate, translate],
  );

  const currentLang = activeLang
    ? languages.find((l) => l.code === activeLang) ?? FALLBACK_LANGUAGES.find((l) => l.code === activeLang)
    : null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="group flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-50"
        aria-label="Translate article"
        title="Translate this article"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Globe className="h-3.5 w-3.5" />
        )}
        <span>{currentLang ? currentLang.code.toUpperCase() : "Translate"}</span>
        {!loading && <ChevronDown className="h-3 w-3 opacity-60" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 border rule bg-background shadow-xl rounded-sm z-50 animate-fade-in">
          <div className="flex items-center justify-between px-3 py-2 border-b rule">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {languages.length} Languages
            </span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-2 border-b rule">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border rule focus:outline-none focus:ring-1 focus:ring-foreground/40"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <button
              onClick={() => handleSelect("en")}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-foreground/[0.05] transition text-left ${!activeLang ? "bg-foreground/[0.03]" : ""}`}
            >
              <span className="text-lg">🇬🇧</span>
              <div className="flex-1">
                <div className="font-medium">English</div>
                <div className="text-xs text-muted-foreground">Original</div>
              </div>
              {!activeLang && <Check className="h-4 w-4 text-foreground" />}
            </button>
            {filteredLanguages.map((l) => (
              <button
                key={l.code}
                onClick={() => handleSelect(l.code)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-foreground/[0.05] transition text-left ${activeLang === l.code ? "bg-foreground/[0.03]" : ""}`}
              >
                <span className="text-lg">{l.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{l.nativeName}</div>
                  <div className="text-xs text-muted-foreground">{l.name}</div>
                </div>
                {activeLang === l.code && <Check className="h-4 w-4 text-foreground" />}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No languages match "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <span className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap">{error}</span>
      )}
    </div>
  );
}
