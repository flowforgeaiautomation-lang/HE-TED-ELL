import { useEffect, useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useReadingPrefs } from "@/hooks/use-reading-prefs";
import { supabase } from "@/integrations/supabase/client";
import { type ReadingNote } from "@/lib/reading-prefs";
import { aiExplainText } from "@/lib/reading-ai.functions";
import { translateVisibleText } from "@/lib/translation.functions";
import { toast } from "sonner";
import { X, Volume2, Square, Globe, BookOpen, Sparkles, Maximize, Minimize } from "lucide-react";

type PopupAction = "none" | "explain" | "translate" | "dictionary";

/**
 * ReadingExperience — full reading experience controller.
 * Features: progress bar, auto-scroll, wake lock, reading ruler, paragraph highlight,
 * focus mode, fullscreen, immersive/zen mode, text selection menu (save, copy, share,
 * pronounce, read aloud, AI explain, translate, dictionary), narration with voice,
 * sticky TOC, mini map, reading achievements, data saver, offline cache, keyboard nav.
 */
export function ReadingExperience({
  articleSlug,
  articleContentRef,
  articleTitle,
  articleSections,
}: {
  articleSlug: string;
  articleContentRef: React.RefObject<HTMLElement | null>;
  articleTitle: string;
  articleSections?: { id: string; label: string }[];
}) {
  const { prefs, loaded, signedIn } = useReadingPrefs();
  const [progress, setProgress] = useState(0);
  const [readSeconds, setReadSeconds] = useState(0);
  const [rulerY, setRulerY] = useState(0);
  const [showNoteMenu, setShowNoteMenu] = useState(false);
  const [noteMenuPos, setNoteMenuPos] = useState({ x: 0, y: 0 });
  const [savedNotes, setSavedNotes] = useState<ReadingNote[]>([]);
  const [popupAction, setPopupAction] = useState<PopupAction>("none");
  const [popupContent, setPopupContent] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [narratingEl, setNarratingEl] = useState<HTMLElement | null>(null);
  const [showToc, setShowToc] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [achievements, setAchievements] = useState<string[]>([]);

  const wakeLockRef = useRef<any>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const narrateRef = useRef<SpeechSynthesisUtterance | null>(null);

  const explainFn = useServerFn(aiExplainText);
  const translateFn = useServerFn(translateVisibleText);

  // Load saved notes
  useEffect(() => {
    if (!signedIn) {
      const local = JSON.parse(localStorage.getItem("tuh-reading-notes") || "[]");
      setSavedNotes(local.filter((n: ReadingNote) => n.article_slug === articleSlug));
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("reading_notes")
        .select("id, article_slug, selected_text, note, color, created_at")
        .eq("article_slug", articleSlug);
      if (data) setSavedNotes(data as ReadingNote[]);
    })();
  }, [signedIn, articleSlug]);

  // Reading progress bar
  useEffect(() => {
    if (!prefs.readingProgressBar) { setProgress(0); return; }
    function onScroll() {
      const el = articleContentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [prefs.readingProgressBar, articleContentRef]);

  // Keep latest progress/readSeconds in refs so intervals don't need them as deps
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const readSecondsRef = useRef(readSeconds);
  readSecondsRef.current = readSeconds;

  // Reading time tracker + achievements
  useEffect(() => {
    if (!prefs.focusTimer && !prefs.continueWhereLeftOff) return;
    readTimerRef.current = setInterval(() => {
      setReadSeconds((s) => {
        const next = s + 1;
        const p = progressRef.current;
        if (next === 60) setAchievements((a) => a.includes("1min") ? a : [...a, "1min"]);
        if (next === 300) setAchievements((a) => a.includes("5min") ? a : [...a, "5min"]);
        if (next === 600) setAchievements((a) => a.includes("10min") ? a : [...a, "10min"]);
        if (p > 50) setAchievements((a) => a.includes("halfway") ? a : [...a, "halfway"]);
        if (p > 95) setAchievements((a) => a.includes("finished") ? a : [...a, "finished"]);
        return next;
      });
    }, 1000);
    return () => { if (readTimerRef.current) clearInterval(readTimerRef.current); };
  }, [prefs.focusTimer, prefs.continueWhereLeftOff]);

  // Save reading progress
  useEffect(() => {
    if (!signedIn || !prefs.continueWhereLeftOff) return;
    const interval = setInterval(async () => {
      const p = progressRef.current;
      if (p > 0) {
        await supabase.from("reading_progress").upsert({
          article_slug: articleSlug,
          scroll_percent: Math.round(p),
          read_seconds: readSecondsRef.current,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,article_slug" });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [signedIn, prefs.continueWhereLeftOff, articleSlug]);

  // Restore scroll position
  useEffect(() => {
    if (!signedIn || !prefs.rememberScrollPosition || !loaded) return;
    (async () => {
      const { data } = await supabase
        .from("reading_progress")
        .select("scroll_percent")
        .eq("article_slug", articleSlug)
        .maybeSingle();
      if (data?.scroll_percent && data.scroll_percent > 5) {
        const el = articleContentRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const target = window.scrollY + rect.top + (rect.height * data.scroll_percent / 100) - window.innerHeight / 2;
          window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        }
      }
    })();
  }, [signedIn, prefs.rememberScrollPosition, loaded, articleSlug]);

  // Auto scroll
  useEffect(() => {
    if (!prefs.autoScroll) {
      if (autoScrollRef.current) { clearInterval(autoScrollRef.current); autoScrollRef.current = null; }
      return;
    }
    const pxPerSec = prefs.scrollSpeed * 20;
    autoScrollRef.current = setInterval(() => {
      window.scrollBy({ top: pxPerSec / 10, behavior: "auto" });
    }, 100);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [prefs.autoScroll, prefs.scrollSpeed]);

  // Wake lock
  useEffect(() => {
    if (!prefs.keepScreenAwake) {
      if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
      return;
    }
    (async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {}
    })();
    return () => {
      if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
    };
  }, [prefs.keepScreenAwake]);

  // Reading ruler
  useEffect(() => {
    if (!prefs.readingRuler) return;
    function onMove(e: MouseEvent) { setRulerY(e.clientY - 40); }
    window.addEventListener("mousemove", onMove);
    document.documentElement.classList.add("tuh-reading-ruler-active");
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.classList.remove("tuh-reading-ruler-active");
    };
  }, [prefs.readingRuler]);

  // Highlight current paragraph
  useEffect(() => {
    if (!prefs.highlightCurrentParagraph) return;
    const el = articleContentRef.current;
    if (!el) return;
    const paragraphs = el.querySelectorAll("p");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            paragraphs.forEach((p) => p.classList.remove("tuh-current-paragraph"));
            entry.target.classList.add("tuh-current-paragraph");
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    paragraphs.forEach((p) => observer.observe(p));
    return () => observer.disconnect();
  }, [prefs.highlightCurrentParagraph, articleContentRef]);

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Mini map for long articles
  useEffect(() => {
    if (!loaded) return;
    const el = articleContentRef.current;
    if (!el) return;
    if (el.scrollHeight > 3000) {
      setShowMiniMap(true);
    }
  }, [loaded, articleContentRef]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        setShowNoteMenu(false);
        setPopupAction("none");
        window.speechSynthesis.cancel();
        setIsNarrating(false);
      }
      if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.();
        }
      }
      if (e.key === "j") window.scrollBy({ top: 100, behavior: "smooth" });
      if (e.key === "k") window.scrollBy({ top: -100, behavior: "smooth" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Text selection
  useEffect(() => {
    if (!prefs.enableTextHighlighting) return;
    function onMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length < 3) {
        setShowNoteMenu(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setNoteMenuPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setShowNoteMenu(true);
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [prefs.enableTextHighlighting]);

  // --- Actions ---

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const stopNarration = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsNarrating(false);
    if (narratingEl) narratingEl.classList.remove("tuh-narrating");
    setNarratingEl(null);
  }, []);

  const getSelectedText = useCallback(() => {
    const sel = window.getSelection();
    return sel?.toString().trim() || "";
  }, []);

  const saveNote = useCallback(async () => {
    const text = getSelectedText();
    if (text.length < 3) return;
    if (signedIn) {
      const { data } = await supabase
        .from("reading_notes")
        .insert({ article_slug: articleSlug, selected_text: text })
        .select("id, article_slug, selected_text, note, color, created_at")
        .single();
      if (data) setSavedNotes((n) => [...n, data as ReadingNote]);
    } else {
      const note: ReadingNote = {
        id: crypto.randomUUID(),
        article_slug: articleSlug,
        selected_text: text,
        note: null,
        color: "yellow",
        created_at: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("tuh-reading-notes") || "[]");
      existing.push(note);
      localStorage.setItem("tuh-reading-notes", JSON.stringify(existing));
      setSavedNotes((n) => [...n, note]);
    }
    setShowNoteMenu(false);
    window.getSelection()?.removeAllRanges();
    toast.success("Saved to your notes");
  }, [articleSlug, signedIn, getSelectedText]);

  const copySelection = useCallback(() => {
    const text = getSelectedText();
    if (text) navigator.clipboard.writeText(text);
    setShowNoteMenu(false);
    toast.success("Copied to clipboard");
  }, [getSelectedText]);

  const shareQuote = useCallback(() => {
    const text = getSelectedText();
    if (!text) return;
    const shareText = `"${text}" — The United Hell`;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Quote copied");
    }
    setShowNoteMenu(false);
  }, [getSelectedText]);

  const pronounceWord = useCallback(() => {
    const text = getSelectedText();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = prefs.narrationSpeed;
    const voices = window.speechSynthesis.getVoices();
    if (prefs.narrationVoice && voices.length) {
      const v = voices.find((v) => v.name.includes(prefs.narrationVoice));
      if (v) utter.voice = v;
    }
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(utter), 120);
    setShowNoteMenu(false);
  }, [prefs.narrationSpeed, prefs.narrationVoice, getSelectedText]);

  const readAloud = useCallback(() => {
    const text = getSelectedText();
    if (text.length < 3) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = prefs.narrationSpeed;
    const voices = window.speechSynthesis.getVoices();
    if (prefs.narrationVoice && voices.length) {
      const v = voices.find((v) => v.name.includes(prefs.narrationVoice));
      if (v) utter.voice = v;
    }
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(utter), 120);
    setShowNoteMenu(false);
  }, [prefs.narrationSpeed, prefs.narrationVoice, getSelectedText]);

  const readAloudFromParagraph = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.anchorNode;
    while (node && node.parentElement) {
      if (node.parentElement.tagName === "P") break;
      node = node.parentElement;
    }
    const para = node?.parentElement as HTMLElement | null;
    if (!para) return;
    const text = para.textContent || "";
    if (!text.trim()) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = prefs.narrationSpeed;
    const voices = window.speechSynthesis.getVoices();
    if (prefs.narrationVoice && voices.length) {
      const v = voices.find((v) => v.name.includes(prefs.narrationVoice));
      if (v) utter.voice = v;
    }
    if (narratingEl) narratingEl.classList.remove("tuh-narrating");
    para.classList.add("tuh-narrating");
    setNarratingEl(para);
    utter.onend = () => {
      para.classList.remove("tuh-narrating");
      setIsNarrating(false);
      setNarratingEl(null);
    };
    window.speechSynthesis.cancel();
    setTimeout(() => {
      window.speechSynthesis.speak(utter);
      setIsNarrating(true);
    }, 120);
    setShowNoteMenu(false);
  }, [prefs.narrationSpeed, prefs.narrationVoice, narratingEl]);

  const aiExplain = useCallback(async () => {
    const text = getSelectedText();
    if (text.length < 3) return;
    setPopupAction("explain");
    setPopupLoading(true);
    setPopupPos(noteMenuPos);
    setShowNoteMenu(false);
    try {
      const result = await explainFn({ data: { text, context: articleTitle } });
      setPopupContent(result.explanation || result.error || "Could not generate explanation.");
    } catch (e) {
      setPopupContent("Could not reach the AI service. Please try again.");
    }
    setPopupLoading(false);
  }, [getSelectedText, noteMenuPos, articleTitle, explainFn]);

  const aiTranslate = useCallback(async () => {
    const text = getSelectedText();
    if (text.length < 3) return;
    const lang = localStorage.getItem("tuh-language") || "hi";
    if (lang === "en") {
      toast.info("Set a translation language first from the language picker.");
      setShowNoteMenu(false);
      return;
    }
    setPopupAction("translate");
    setPopupLoading(true);
    setPopupPos(noteMenuPos);
    setShowNoteMenu(false);
    try {
      const result = await translateFn({ data: { target: lang as never, texts: [text] } });
      const translated = result[text] || text;
      setPopupContent(translated);
    } catch {
      setPopupContent("Could not translate. Please try again.");
    }
    setPopupLoading(false);
  }, [getSelectedText, noteMenuPos, translateFn]);

  const dictionaryLookup = useCallback(async () => {
    const text = getSelectedText();
    if (!text) return;
    const word = text.split(/\s+/)[0];
    setPopupAction("dictionary");
    setPopupLoading(true);
    setPopupPos(noteMenuPos);
    setShowNoteMenu(false);
    try {
      const res = await fetch(`/api/public/hooks/dictionary?word=${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setPopupContent(JSON.stringify(data, null, 2));
    } catch {
      setPopupContent("No dictionary entry found for this word.");
    }
    setPopupLoading(false);
  }, [getSelectedText, noteMenuPos]);

  const exportNotes = useCallback(() => {
    const blob = new Blob([JSON.stringify(savedNotes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notes-${articleSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notes exported");
  }, [savedNotes, articleSlug]);

  const clearCache = useCallback(() => {
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    toast.success("Reading cache cleared");
  }, []);

  // Preload next article links
  useEffect(() => {
    if (!prefs.preloadNextArticle) return;
    const links = document.querySelectorAll('a[href^="/article/"]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement;
          link.rel = "preload";
        }
      });
    });
    links.forEach((l) => observer.observe(l));
    return () => observer.disconnect();
  }, [prefs.preloadNextArticle]);

  // Data saver — reduce image quality
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("tuh-data-saver", prefs.dataSaver);
  }, [prefs.dataSaver, loaded]);

  if (!loaded) return null;

  const showImmersive = prefs.focusMode || isFullscreen;

  return (
    <>
      {/* Reading progress bar */}
      {prefs.readingProgressBar && (
        <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
      )}

      {/* Reading ruler */}
      {prefs.readingRuler && (
        <div className="reading-ruler" style={{ top: `${rulerY}px` }} />
      )}

      {/* Focus timer */}
      {prefs.focusTimer && (
        <div className="fixed bottom-6 left-6 z-40 border rule bg-background px-3 py-2 text-xs tabular-nums rounded-sm shadow-sm">
          {Math.floor(readSeconds / 60)}:{String(readSeconds % 60).padStart(2, "0")} read
        </div>
      )}

      {/* Reading achievements */}
      {achievements.length > 0 && (
        <div className="fixed bottom-20 left-6 z-40 flex flex-col gap-1">
          {achievements.map((a) => (
            <div key={a} className="border rule bg-background px-2 py-1 text-xs rounded-sm shadow-sm animate-fade-in">
              {a === "1min" && "1 minute read"}
              {a === "5min" && "5 minutes read"}
              {a === "10min" && "10 minutes read"}
              {a === "halfway" && "Halfway there"}
              {a === "finished" && "Article complete"}
            </div>
          ))}
        </div>
      )}

      {/* Immersive mode controls */}
      {showImmersive && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          {isNarrating && (
            <button onClick={stopNarration} className="border rule bg-background p-2 rounded-sm shadow-sm" title="Stop narration">
              <Square className="h-4 w-4" />
            </button>
          )}
          <button onClick={toggleFullscreen} className="border rule bg-background p-2 rounded-sm shadow-sm" title="Toggle fullscreen">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Sticky TOC */}
      {articleSections && articleSections.length > 0 && (
        <div className="fixed top-20 right-4 z-30 hidden lg:block">
          <button
            onClick={() => setShowToc(!showToc)}
            className="border rule bg-background px-2 py-1 text-xs rounded-sm shadow-sm"
          >
            Contents
          </button>
          {showToc && (
            <div className="mt-2 border rule bg-background p-3 max-w-48 rounded-sm shadow-sm max-h-80vh overflow-y-auto">
              {articleSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); setShowToc(false); }}
                  className="block py-1 text-xs hover:underline"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mini map for long articles */}
      {showMiniMap && (
        <div className="fixed bottom-6 right-20 z-30 hidden md:block">
          <div className="border rule bg-background p-1 rounded-sm shadow-sm">
            <div className="relative h-32 w-3 bg-foreground/[0.06] rounded-sm overflow-hidden">
              <div
                className="absolute left-0 w-full bg-foreground/30"
                style={{
                  top: `${Math.min(95, Math.max(0, progress - 5))}%`,
                  height: "10%",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Text selection menu */}
      {showNoteMenu && (
        <div
          className="fixed z-50 flex gap-0.5 border rule bg-background shadow-lg rounded-sm p-1 flex-wrap max-w-[90vw]"
          style={{ left: `${noteMenuPos.x}px`, top: `${noteMenuPos.y}px`, transform: "translate(-50%, -100%)" }}
        >
          <button onClick={saveNote} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm" title="Save as note">Save</button>
          <button onClick={copySelection} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm" title="Copy">Copy</button>
          <button onClick={shareQuote} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm" title="Share">Share</button>
          <button onClick={pronounceWord} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm" title="Pronounce">Say</button>
          <button onClick={readAloud} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm" title="Read aloud">Read</button>
          <button onClick={readAloudFromParagraph} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm" title="Read from here">From here</button>
          <div className="w-px bg-foreground/10 mx-0.5" />
          <button onClick={aiExplain} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm flex items-center gap-1" title="AI explain">
            <Sparkles className="h-3 w-3" /> Explain
          </button>
          <button onClick={aiTranslate} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm flex items-center gap-1" title="Translate">
            <Globe className="h-3 w-3" /> Translate
          </button>
          <button onClick={dictionaryLookup} className="px-2 py-1 text-xs hover:bg-foreground/[0.08] rounded-sm flex items-center gap-1" title="Dictionary">
            <BookOpen className="h-3 w-3" /> Define
          </button>
        </div>
      )}

      {/* AI/Translation/Dictionary popup */}
      {popupAction !== "none" && (
        <div
          className="fixed z-50 border rule bg-background shadow-xl rounded-sm p-4 max-w-sm max-h-72 overflow-y-auto"
          style={{
            left: `${Math.min(popupPos.x, window.innerWidth - 400)}px`,
            top: `${popupPos.y + 20}px`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="kicker text-muted-foreground">
              {popupAction === "explain" && "AI Explanation"}
              {popupAction === "translate" && "Translation"}
              {popupAction === "dictionary" && "Dictionary"}
            </span>
            <button onClick={() => setPopupAction("none")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {popupLoading ? (
            <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
          ) : popupAction === "dictionary" ? (
            <DictionaryResult raw={popupContent} />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{popupContent}</p>
          )}
        </div>
      )}

      {/* Saved notes */}
      {savedNotes.length > 0 && (
        <div className="mt-8 border-t rule pt-6 tuh-hide-on-focus">
          <div className="flex items-center justify-between mb-3">
            <div className="kicker">Your notes &amp; highlights</div>
            <button onClick={exportNotes} className="text-xs underline hover:text-foreground/70">Export</button>
          </div>
          <div className="space-y-2">
            {savedNotes.map((n) => (
              <div key={n.id} className="border-l-2 border-foreground/30 pl-3 text-sm">
                <p className="italic text-muted-foreground">&ldquo;{n.selected_text}&rdquo;</p>
                {n.note && <p className="mt-1">{n.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function DictionaryResult({ raw }: { raw: string }) {
  let data: any = null;
  try { data = JSON.parse(raw); } catch { return <p className="text-sm">{raw}</p>; }
  if (!data) return <p className="text-sm">No entry found.</p>;
  return (
    <div className="text-sm space-y-2">
      <div className="font-serif text-base font-medium">{data.word}</div>
      {data.partOfSpeech && <div className="text-xs text-muted-foreground italic">{data.partOfSpeech}</div>}
      {data.pronunciation && <div className="text-xs text-muted-foreground">{data.pronunciation}</div>}
      {data.meaning && <p>{data.meaning}</p>}
      {data.simpleExplanation && <p className="text-muted-foreground">{data.simpleExplanation}</p>}
      {data.example && <p className="italic text-muted-foreground">&ldquo;{data.example}&rdquo;</p>}
      {data.synonyms?.length > 0 && <div className="text-xs"><span className="text-muted-foreground">Synonyms: </span>{data.synonyms.join(", ")}</div>}
      {data.antonyms?.length > 0 && <div className="text-xs"><span className="text-muted-foreground">Antonyms: </span>{data.antonyms.join(", ")}</div>}
    </div>
  );
}
