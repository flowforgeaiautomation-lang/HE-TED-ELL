import { useEffect, useState, useRef } from "react";
import { useReadingPrefs } from "@/hooks/use-reading-prefs";
import { applyReadingPrefs } from "@/lib/apply-reading-prefs";
import {
  type ReadingPreferences,
  type FontSize,
  type FontFamily,
  type FontWeight,
  type LineSpacing,
  type ParagraphSpacing,
  type ReadingWidth,
  type TextAlignment,
  type Theme,
  type SummaryLength,
  type CommentSort,
  type CommentView,
  type VocabDifficulty,
  DEFAULT_READING_PREFS,
} from "@/lib/reading-prefs";
import {
  Type, AlignLeft, Palette, Accessibility, BookOpen, Image as ImageIcon,
  GraduationCap, User, Zap, Share2, Settings, X, RotateCcw, Download, Upload,
  Sun, Moon, Monitor, Coffee, FileText, Star, Contrast,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "text" | "layout" | "theme" | "accessibility" | "reading" | "media" | "learning" | "personalization" | "performance" | "sharing" | "advanced";

const TABS: { id: Tab; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "layout", label: "Layout", icon: AlignLeft },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "learning", label: "Learning", icon: GraduationCap },
  { id: "personalization", label: "You", icon: User },
  { id: "performance", label: "Performance", icon: Zap },
  { id: "sharing", label: "Notes", icon: Share2 },
  { id: "advanced", label: "Advanced", icon: Settings },
];

function SegmentedControl<T extends string>({
  options, value, onChange, labels,
}: {
  options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`border rule px-3 py-1.5 text-xs capitalize transition rounded-sm ${
            value === opt ? "bg-foreground text-background border-foreground" : "hover:bg-foreground/[0.05]"
          }`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between border rule px-4 py-3 transition rounded-sm hover:bg-foreground/[0.03]"
    >
      <span className="text-sm">{label}</span>
      <span className={`h-5 w-9 rounded-full border transition relative ${checked ? "bg-foreground border-foreground" : "bg-foreground/10"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background border transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="border rule px-4 py-3 rounded-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="kicker mb-3 text-muted-foreground">{children}</div>;
}

function NarrationVoiceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    function load() {
      const v = window.speechSynthesis?.getVoices() || [];
      setVoices(v);
    }
    load();
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
  }, []);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rule px-3 py-2 text-sm rounded-sm w-full bg-background"
    >
      <option value="">Default voice</option>
      {voices.map((v) => (
        <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
      ))}
    </select>
  );
}

export function ReadingSettings() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("text");
  const { prefs, update, reset, exportPrefs, importPrefs, loaded, signedIn } = useReadingPrefs();
  const fileRef = useRef<HTMLInputElement>(null);

  // Apply prefs to <html> whenever they change — no gating on `loaded`
  // because the inline bootstrap script in __root.tsx handles the initial paint
  useEffect(() => {
    applyReadingPrefs(prefs);
  }, [prefs]);

  // Open with keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === "r") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importPrefs(reader.result as string);
        toast.success("Reading preferences imported");
      } catch {
        toast.error("Could not import preferences file");
      }
    };
    reader.readAsText(file);
  }

  const p = prefs;
  const set = update;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Reading settings"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-foreground bg-background shadow-lg hover:bg-foreground hover:text-background transition"
      >
        <Settings className="h-5 w-5" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-end sm:justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[85vh] bg-background border-l sm:border rule shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b rule px-5 py-4 flex-none">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <Settings className="h-5 w-5" /> Reading Settings
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {signedIn ? "Synced to your account" : "Saved on this device"}
                </span>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto border-b rule px-3 py-2 flex-none">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap transition rounded-sm ${
                      tab === t.id ? "bg-foreground text-background" : "hover:bg-foreground/[0.05] text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* TEXT */}
              {tab === "text" && (
                <>
                  <div>
                    <SectionLabel>Font Size</SectionLabel>
                    <SegmentedControl<FontSize>
                      options={["xs","sm","md","lg","xl","xxl"] as const}
                      value={p.fontSize}
                      onChange={(v) => set({ fontSize: v })}
                      labels={{ xs: "XS", sm: "Small", md: "Medium", lg: "Large", xl: "XL", xxl: "XXL" }}
                    />
                  </div>
                  <div>
                    <SectionLabel>Font Family</SectionLabel>
                    <SegmentedControl<FontFamily>
                      options={["default","serif","sans","dyslexia","newspaper","mono"] as const}
                      value={p.fontFamily}
                      onChange={(v) => set({ fontFamily: v })}
                      labels={{ default: "Default", serif: "Serif", sans: "Sans", dyslexia: "Dyslexia", newspaper: "Newspaper", mono: "Mono" }}
                    />
                  </div>
                  <div>
                    <SectionLabel>Font Weight</SectionLabel>
                    <SegmentedControl<FontWeight>
                      options={["light","regular","medium","bold"] as const}
                      value={p.fontWeight}
                      onChange={(v) => set({ fontWeight: v })}
                    />
                  </div>
                </>
              )}

              {/* LAYOUT */}
              {tab === "layout" && (
                <>
                  <div>
                    <SectionLabel>Line Spacing</SectionLabel>
                    <SegmentedControl<LineSpacing>
                      options={["compact","normal","relaxed","loose"] as const}
                      value={p.lineSpacing}
                      onChange={(v) => set({ lineSpacing: v })}
                    />
                  </div>
                  <div>
                    <SectionLabel>Paragraph Spacing</SectionLabel>
                    <SegmentedControl<ParagraphSpacing>
                      options={["compact","normal","spacious"] as const}
                      value={p.paragraphSpacing}
                      onChange={(v) => set({ paragraphSpacing: v })}
                    />
                  </div>
                  <div>
                    <SectionLabel>Reading Width</SectionLabel>
                    <SegmentedControl<ReadingWidth>
                      options={["narrow","medium","wide","full"] as const}
                      value={p.readingWidth}
                      onChange={(v) => set({ readingWidth: v })}
                    />
                  </div>
                  <div>
                    <SectionLabel>Text Alignment</SectionLabel>
                    <SegmentedControl<TextAlignment>
                      options={["left","justify"] as const}
                      value={p.textAlignment}
                      onChange={(v) => set({ textAlignment: v })}
                      labels={{ left: "Left", justify: "Justified" }}
                    />
                  </div>
                  <Toggle label="Indent first paragraph" checked={p.indentFirstParagraph} onChange={(v) => set({ indentFirstParagraph: v })} />
                </>
              )}

              {/* THEME */}
              {tab === "theme" && (
                <div>
                  <SectionLabel>Theme</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                      { id: "system", label: "System", icon: Monitor },
                      { id: "sepia", label: "Sepia", icon: Coffee },
                      { id: "paper", label: "Paper", icon: FileText },
                      { id: "midnight", label: "Midnight", icon: Moon },
                      { id: "high-contrast", label: "High Contrast", icon: Contrast },
                    ] as const).map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            const next = { ...prefs, theme: t.id };
                            applyReadingPrefs(next);
                            set({ theme: t.id });
                          }}
                          className={`flex items-center gap-2 border rule px-4 py-3 text-sm transition rounded-sm ${
                            p.theme === t.id ? "bg-foreground text-background border-foreground" : "hover:bg-foreground/[0.05]"
                          }`}
                        >
                          <Icon className="h-4 w-4" /> {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACCESSIBILITY */}
              {tab === "accessibility" && (
                <div className="space-y-2">
                  <Toggle label="High contrast mode" checked={p.highContrast} onChange={(v) => set({ highContrast: v })} />
                  <Toggle label="Dyslexia-friendly font" checked={p.dyslexiaFont} onChange={(v) => set({ dyslexiaFont: v })} />
                  <Toggle label="Reduce motion" checked={p.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
                  <Toggle label="Reduce animations" checked={p.reduceAnimations} onChange={(v) => set({ reduceAnimations: v })} />
                  <Toggle label="Increase touch targets" checked={p.increaseTouchTargets} onChange={(v) => set({ increaseTouchTargets: v })} />
                  <Toggle label="Underline links" checked={p.underlineLinks} onChange={(v) => set({ underlineLinks: v })} />
                  <Toggle label="Larger icons" checked={p.largerIcons} onChange={(v) => set({ largerIcons: v })} />
                  <Toggle label="Focus highlight" checked={p.focusHighlight} onChange={(v) => set({ focusHighlight: v })} />
                  <Toggle label="Color-blind friendly mode" checked={p.colorBlindFriendly} onChange={(v) => set({ colorBlindFriendly: v })} />
                  <Toggle label="Better keyboard navigation" checked={p.keyboardNavigation} onChange={(v) => set({ keyboardNavigation: v })} />
                  <Toggle label="Screen reader optimization" checked={p.screenReaderOptimization} onChange={(v) => set({ screenReaderOptimization: v })} />
                </div>
              )}

              {/* READING */}
              {tab === "reading" && (
                <div className="space-y-2">
                  <Toggle label="Reading progress bar" checked={p.readingProgressBar} onChange={(v) => set({ readingProgressBar: v })} />
                  <Toggle label="Auto scroll" checked={p.autoScroll} onChange={(v) => set({ autoScroll: v })} />
                  <Slider label="Scroll speed" value={p.scrollSpeed} min={1} max={10} step={1} onChange={(v) => set({ scrollSpeed: v })} />
                  <Toggle label="Keep screen awake while reading" checked={p.keepScreenAwake} onChange={(v) => set({ keepScreenAwake: v })} />
                  <Toggle label="Reading ruler" checked={p.readingRuler} onChange={(v) => set({ readingRuler: v })} />
                  <Toggle label="Highlight current paragraph" checked={p.highlightCurrentParagraph} onChange={(v) => set({ highlightCurrentParagraph: v })} />
                  <Toggle label="Focus mode (distraction-free)" checked={p.focusMode} onChange={(v) => set({ focusMode: v })} />
                  <Toggle label="Full screen reading" checked={p.fullScreenReading} onChange={(v) => set({ fullScreenReading: v })} />
                  <Toggle label="Sticky table of contents" checked={p.stickyToc} onChange={(v) => set({ stickyToc: v })} />
                  <Toggle label="Mini map for long articles" checked={p.miniMap} onChange={(v) => set({ miniMap: v })} />
                  <Toggle label="Reading achievements" checked={p.readingAchievements} onChange={(v) => set({ readingAchievements: v })} />
                </div>
              )}

              {/* MEDIA */}
              {tab === "media" && (
                <div className="space-y-2">
                  <Slider label="Narration speed" value={p.narrationSpeed} min={0.5} max={2} step={0.25} onChange={(v) => set({ narrationSpeed: v })} format={(v) => `${v}x`} />
                  <div>
                    <SectionLabel>Narration Voice</SectionLabel>
                    <NarrationVoiceSelect value={p.narrationVoice} onChange={(v) => set({ narrationVoice: v })} />
                  </div>
                  <Toggle label="Highlight text while narrating" checked={p.highlightWhileNarrating} onChange={(v) => set({ highlightWhileNarrating: v })} />
                  <div>
                    <SectionLabel>Image Quality</SectionLabel>
                    <SegmentedControl
                      options={["low","medium","high"] as const}
                      value={p.imageQuality}
                      onChange={(v) => set({ imageQuality: v as ReadingPreferences["imageQuality"] })}
                    />
                  </div>
                  <Toggle label="Click-to-zoom images" checked={p.clickToZoomImages} onChange={(v) => set({ clickToZoomImages: v })} />
                </div>
              )}

              {/* LEARNING */}
              {tab === "learning" && (
                <div className="space-y-2">
                  <Toggle label="Show vocabulary builder" checked={p.showVocabulary} onChange={(v) => set({ showVocabulary: v })} />
                  <Toggle label="Show difficult words only" checked={p.difficultWordsOnly} onChange={(v) => set({ difficultWordsOnly: v })} />
                  <div>
                    <SectionLabel>Vocabulary Difficulty</SectionLabel>
                    <SegmentedControl<VocabDifficulty>
                      options={["all","intermediate","advanced"] as const}
                      value={p.vocabDifficulty}
                      onChange={(v) => set({ vocabDifficulty: v })}
                    />
                  </div>
                  <Toggle label="Show pronunciation" checked={p.showPronunciation} onChange={(v) => set({ showPronunciation: v })} />
                  <Toggle label="Show etymology" checked={p.showEtymology} onChange={(v) => set({ showEtymology: v })} />
                  <Toggle label="Auto-save learned words" checked={p.autoSaveLearnedWords} onChange={(v) => set({ autoSaveLearnedWords: v })} />
                  <Toggle label="Show key takeaways" checked={p.showKeyTakeaways} onChange={(v) => set({ showKeyTakeaways: v })} />
                  <Toggle label="Enable quizzes" checked={p.enableQuizzes} onChange={(v) => set({ enableQuizzes: v })} />
                  <div>
                    <SectionLabel>Quiz Difficulty</SectionLabel>
                    <SegmentedControl<VocabDifficulty>
                      options={["all","intermediate","advanced"] as const}
                      value={p.quizDifficulty}
                      onChange={(v) => set({ quizDifficulty: v })}
                    />
                  </div>
                  <Toggle label="Reflection prompts" checked={p.reflectionPrompts} onChange={(v) => set({ reflectionPrompts: v })} />
                  <Toggle label="Bigger picture section" checked={p.biggerPicture} onChange={(v) => set({ biggerPicture: v })} />
                </div>
              )}

              {/* PERSONALIZATION */}
              {tab === "personalization" && (
                <div className="space-y-2">
                  <Toggle label="Continue where I left off" checked={p.continueWhereLeftOff} onChange={(v) => set({ continueWhereLeftOff: v })} />
                  <Toggle label="Remember scroll position" checked={p.rememberScrollPosition} onChange={(v) => set({ rememberScrollPosition: v })} />
                  <div>
                    <SectionLabel>Default Summary Length</SectionLabel>
                    <SegmentedControl<SummaryLength>
                      options={["brief","standard","detailed"] as const}
                      value={p.summaryLength}
                      onChange={(v) => set({ summaryLength: v })}
                    />
                  </div>
                  <Toggle label="Show related articles" checked={p.showRelatedArticles} onChange={(v) => set({ showRelatedArticles: v })} />
                  <Toggle label="Show recommendations" checked={p.showRecommendations} onChange={(v) => set({ showRecommendations: v })} />
                  <div>
                    <SectionLabel>Default Comment Sort</SectionLabel>
                    <SegmentedControl<CommentSort>
                      options={["newest","oldest","top"] as const}
                      value={p.commentSort}
                      onChange={(v) => set({ commentSort: v })}
                    />
                  </div>
                  <div>
                    <SectionLabel>Default Comment View</SectionLabel>
                    <SegmentedControl<CommentView>
                      options={["flat","threaded"] as const}
                      value={p.commentView}
                      onChange={(v) => set({ commentView: v })}
                    />
                  </div>
                </div>
              )}

              {/* PERFORMANCE */}
              {tab === "performance" && (
                <div className="space-y-2">
                  <Toggle label="Data saver" checked={p.dataSaver} onChange={(v) => set({ dataSaver: v })} />
                  <Toggle label="Lazy load images" checked={p.lazyLoadImages} onChange={(v) => set({ lazyLoadImages: v })} />
                  <Toggle label="Preload next article" checked={p.preloadNextArticle} onChange={(v) => set({ preloadNextArticle: v })} />
                  <Toggle label="Offline reading (cache articles)" checked={p.offlineReading} onChange={(v) => set({ offlineReading: v })} />
                  <button
                    onClick={() => {
                      if ("caches" in window) {
                        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
                      }
                      toast.success("Reading cache cleared");
                    }}
                    className="flex items-center gap-2 w-full border rule px-4 py-3 text-sm hover:bg-foreground/[0.05] rounded-sm"
                  >
                    <RotateCcw className="h-4 w-4" /> Clear reading cache
                  </button>
                </div>
              )}

              {/* SHARING & NOTES */}
              {tab === "sharing" && (
                <div className="space-y-2">
                  <Toggle label="Enable text highlighting" checked={p.enableTextHighlighting} onChange={(v) => set({ enableTextHighlighting: v })} />
                  <p className="text-xs text-muted-foreground px-1">
                    Highlight any text in an article to save it as a note, copy it, or share it. Your notes sync across devices when signed in.
                  </p>
                </div>
              )}

              {/* ADVANCED */}
              {tab === "advanced" && (
                <div className="space-y-3">
                  <Toggle label="Eye comfort mode" checked={p.eyeComfortMode} onChange={(v) => set({ eyeComfortMode: v })} />
                  <Toggle label="Adaptive font size" checked={p.adaptiveFontSize} onChange={(v) => set({ adaptiveFontSize: v })} />
                  <Toggle label="Focus timer" checked={p.focusTimer} onChange={(v) => set({ focusTimer: v })} />
                  <Toggle label="Immersive reading mode" checked={p.immersiveMode} onChange={(v) => set({ immersiveMode: v })} />
                  <Toggle label="Zen mode" checked={p.zenMode} onChange={(v) => set({ zenMode: v })} />
                  <div className="pt-4 border-t rule space-y-2">
                    <button
                      onClick={() => { reset(); toast.success("Reading settings restored to defaults"); }}
                      className="flex items-center gap-2 w-full border rule px-4 py-3 text-sm hover:bg-foreground/[0.05] rounded-sm"
                    >
                      <RotateCcw className="h-4 w-4" /> Restore default settings
                    </button>
                    <button
                      onClick={exportPrefs}
                      className="flex items-center gap-2 w-full border rule px-4 py-3 text-sm hover:bg-foreground/[0.05] rounded-sm"
                    >
                      <Download className="h-4 w-4" /> Export reading preferences
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 w-full border rule px-4 py-3 text-sm hover:bg-foreground/[0.05] rounded-sm"
                    >
                      <Upload className="h-4 w-4" /> Import reading preferences
                    </button>
                    <input ref={fileRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t rule px-5 py-3 flex-none flex items-center justify-between text-xs text-muted-foreground">
              <span>Changes apply instantly</span>
              <span>Ctrl+Alt+R to toggle</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
