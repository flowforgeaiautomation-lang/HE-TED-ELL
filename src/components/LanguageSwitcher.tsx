import { useEffect, useState, useRef } from "react";
import { Globe, Search, Check, X, ChevronDown } from "lucide-react";

const ALL_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
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

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tuh-language") || "en";
    setCurrent(saved);
    document.documentElement.lang = saved;
    document.documentElement.dir = saved === "ar" || saved === "he" ? "rtl" : "ltr";
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    function onToggle() {
      setOpen((prev) => !prev);
    }
    window.addEventListener("tuh-toggle-translate", onToggle);
    return () => window.removeEventListener("tuh-toggle-translate", onToggle);
  }, []);

  const selectLanguage = (code: string) => {
    setCurrent(code);
    localStorage.setItem("tuh-language", code);
    document.documentElement.lang = code;
    document.documentElement.dir = code === "ar" || code === "he" ? "rtl" : "ltr";
    window.dispatchEvent(new Event("tuh-preferences"));
    setOpen(false);
    if (code !== "en") {
      window.dispatchEvent(new CustomEvent("tuh-language-change", { detail: { language: code } }));
    }
  };

  const filtered = ALL_LANGUAGES.filter((l) => {
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.includes(q);
  });

  const currentLang = ALL_LANGUAGES.find((l) => l.code === current) || ALL_LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition rounded-sm font-medium"
        aria-label="Change language / Translate"
        title={`Language: ${currentLang.name}`}
      >
        <Globe className="h-3.5 w-3.5" />
        {!compact && <span>Translate</span>}
        {!compact && <ChevronDown className="h-3 w-3 opacity-60" />}
        {compact && <span className="text-xs">{currentLang.code.toUpperCase()}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 border rule bg-background shadow-xl rounded-sm z-50 animate-fade-in">
          <div className="p-3 border-b rule">
            <div className="flex items-center gap-2 border rule px-2 py-1.5 rounded-sm">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search languages..."
                className="bg-transparent text-sm outline-none flex-1"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((l) => (
              <button
                key={l.code}
                onClick={() => selectLanguage(l.code)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-foreground/[0.05] transition text-left ${l.code === current ? "bg-foreground/[0.03]" : ""}`}
              >
                <span className="text-lg">{l.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{l.nativeName}</div>
                  <div className="text-xs text-muted-foreground">{l.name}</div>
                </div>
                {l.code === current && <Check className="h-4 w-4 text-foreground" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">No languages found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
