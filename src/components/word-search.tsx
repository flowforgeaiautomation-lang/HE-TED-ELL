import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Volume2, TrendingUp, ChevronDown } from "lucide-react";
import { searchWord, popularWords } from "@/lib/word-search.functions";
import type { VocabEntry } from "@/lib/types";

export function WordSearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useServerFn(searchWord);
  const fetchPopular = useServerFn(popularWords);

  const debouncedTrim = debounced.trim();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["word-search", debouncedTrim],
    queryFn: () => runSearch({ data: { word: debouncedTrim } }),
    enabled: debouncedTrim.length >= 2,
    staleTime: 1000 * 60 * 30,
  });

  const { data: popular = [] } = useQuery({
    queryKey: ["popular-words"],
    queryFn: () => fetchPopular({ data: {} }),
    staleTime: 1000 * 60 * 10,
  });

  const runFor = (word: string) => {
    setQuery(word);
    setDebounced(word);
    inputRef.current?.focus();
  };

  const clear = () => {
    setQuery("");
    setDebounced("");
    inputRef.current?.focus();
  };

  const found = data?.found ? data.entry : null;
  const showResult = debouncedTrim.length >= 2 && (isLoading || isFetching || data !== undefined);
  const notFound = data && !data.found;

  return (
    <section aria-label="Universal vocabulary search" className="mt-10 border-t rule pt-10">
      <div className="kicker mb-3 flex items-center gap-2">
        <Search className="h-4 w-4" aria-hidden />
        Don't Get a Word?
      </div>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Search any word to instantly see its meaning, pronunciation, synonyms, examples, and more.
      </p>

      <div className="relative">
        <label htmlFor="tuh-word-search" className="sr-only">Search any word</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="tuh-word-search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) setDebounced(query.trim());
          }}
          placeholder="Search any word..."
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-full border rule bg-background py-3.5 pl-12 pr-12 text-base font-serif leading-snug shadow-sm transition focus:outline-none focus:ring-2 focus:ring-foreground/30"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showResult && (
        <div className="mt-4">
          {isLoading || isFetching ? (
            <div className="rounded-xl border rule p-5 text-sm text-muted-foreground">Searching the dictionary…</div>
          ) : found ? (
            <ResultCard entry={found} />
          ) : notFound ? (
            <div className="rounded-xl border rule p-5 text-sm text-muted-foreground">
              No dictionary entry was found for this word. Please check the spelling or try another word.
            </div>
          ) : null}
        </div>
      )}

      {popular.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Popular Searches
          </div>
          <div className="flex flex-wrap gap-2">
            {popular.map((w) => (
              <button key={w} type="button" onClick={() => runFor(w)} className="rounded-full border rule px-3 py-1.5 text-sm transition hover:bg-foreground hover:text-background focus:outline-none focus:ring-2 focus:ring-foreground/30">
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ResultCard({ entry }: { entry: VocabEntry }) {
  const [open, setOpen] = useState(true);
  const speak = () => {
    if (typeof window === "undefined" || !entry.word) return;
    try {
      const u = new SpeechSynthesisUtterance(entry.word);
      u.rate = 0.9;
      window.speechSynthesis?.speak(u);
    } catch { /* ignore */ }
  };

  return (
    <div className="overflow-hidden rounded-xl border rule bg-background shadow-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-foreground/[0.03] focus:outline-none focus:ring-2 focus:ring-foreground/30">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-serif text-2xl">{entry.word}</h3>
          {entry.pronunciation && <span className="text-sm italic text-muted-foreground">{entry.pronunciation}</span>}
          {entry.partOfSpeech && (
            <span className="border rule px-2 py-0.5 text-[0.65rem] uppercase tracking-widest text-muted-foreground">{entry.partOfSpeech}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); speak(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); speak(); } }}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
            aria-label={`Pronounce ${entry.word}`}>
            <Volume2 className="h-4 w-4" />
          </span>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t rule p-5">
          {entry.meaning && <p className="text-base leading-relaxed text-foreground/90"><span className="font-semibold">Meaning:</span> {entry.meaning}</p>}
          {entry.simpleExplanation && <p className="text-sm leading-relaxed text-foreground/70">{entry.simpleExplanation}</p>}
          {entry.example && <p className="border-l-2 border-foreground/10 pl-3 text-sm italic leading-relaxed text-muted-foreground">{entry.example}</p>}
          {(entry.synonyms?.length || entry.antonyms?.length) && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {entry.synonyms?.length ? <div><span className="font-semibold text-foreground/80">Synonyms:</span> <span className="text-muted-foreground">{entry.synonyms.join(", ")}</span></div> : null}
              {entry.antonyms?.length ? <div><span className="font-semibold text-foreground/80">Antonyms:</span> <span className="text-muted-foreground">{entry.antonyms.join(", ")}</span></div> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
