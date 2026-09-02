export type FontSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
export type FontFamily = "default" | "serif" | "sans" | "dyslexia" | "newspaper" | "mono";
export type FontWeight = "light" | "regular" | "medium" | "bold";
export type LineSpacing = "compact" | "normal" | "relaxed" | "loose";
export type ParagraphSpacing = "compact" | "normal" | "spacious";
export type ReadingWidth = "narrow" | "medium" | "wide" | "full";
export type TextAlignment = "left" | "justify";
export type Theme = "light" | "dark" | "system" | "sepia" | "paper" | "midnight" | "high-contrast";
export type SummaryLength = "brief" | "standard" | "detailed";
export type CommentSort = "newest" | "oldest" | "top";
export type CommentView = "flat" | "threaded";
export type VocabDifficulty = "all" | "intermediate" | "advanced";

export type ReadingPreferences = {
  // 1. Text appearance
  fontSize: FontSize;
  fontFamily: FontFamily;
  fontWeight: FontWeight;
  // 2. Layout
  lineSpacing: LineSpacing;
  paragraphSpacing: ParagraphSpacing;
  readingWidth: ReadingWidth;
  textAlignment: TextAlignment;
  indentFirstParagraph: boolean;
  // 3. Theme
  theme: Theme;
  // 4. Accessibility
  highContrast: boolean;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  reduceAnimations: boolean;
  increaseTouchTargets: boolean;
  underlineLinks: boolean;
  largerIcons: boolean;
  focusHighlight: boolean;
  colorBlindFriendly: boolean;
  // 5. Reading experience
  readingProgressBar: boolean;
  autoScroll: boolean;
  scrollSpeed: number; // 1-10
  keepScreenAwake: boolean;
  readingRuler: boolean;
  highlightCurrentParagraph: boolean;
  focusMode: boolean;
  fullScreenReading: boolean;
  stickyToc: boolean;
  miniMap: boolean;
  readingAchievements: boolean;
  // 6. Media
  narrationSpeed: number; // 0.5-2
  narrationVoice: string; // "" = default
  highlightWhileNarrating: boolean;
  imageQuality: "low" | "medium" | "high";
  clickToZoomImages: boolean;
  // 7. Learning
  showVocabulary: boolean;
  difficultWordsOnly: boolean;
  vocabDifficulty: VocabDifficulty;
  showPronunciation: boolean;
  showEtymology: boolean;
  autoSaveLearnedWords: boolean;
  showKeyTakeaways: boolean;
  enableQuizzes: boolean;
  quizDifficulty: VocabDifficulty;
  reflectionPrompts: boolean;
  biggerPicture: boolean;
  // 8. Personalization
  continueWhereLeftOff: boolean;
  rememberScrollPosition: boolean;
  summaryLength: SummaryLength;
  showRelatedArticles: boolean;
  showRecommendations: boolean;
  commentSort: CommentSort;
  commentView: CommentView;
  // 9. Performance
  dataSaver: boolean;
  lazyLoadImages: boolean;
  preloadNextArticle: boolean;
  offlineReading: boolean;
  // 10. Sharing & notes
  enableTextHighlighting: boolean;
  // 12. Premium
  eyeComfortMode: boolean;
  adaptiveFontSize: boolean;
  focusTimer: boolean;
  immersiveMode: boolean;
  zenMode: boolean;
  keyboardNavigation: boolean;
  screenReaderOptimization: boolean;
};

export const DEFAULT_READING_PREFS: ReadingPreferences = {
  fontSize: "md",
  fontFamily: "default",
  fontWeight: "regular",
  lineSpacing: "normal",
  paragraphSpacing: "normal",
  readingWidth: "medium",
  textAlignment: "left",
  indentFirstParagraph: false,
  theme: "system",
  highContrast: false,
  dyslexiaFont: false,
  reduceMotion: false,
  reduceAnimations: false,
  increaseTouchTargets: false,
  underlineLinks: false,
  largerIcons: false,
  focusHighlight: false,
  colorBlindFriendly: false,
  readingProgressBar: true,
  autoScroll: false,
  scrollSpeed: 3,
  keepScreenAwake: false,
  readingRuler: false,
  highlightCurrentParagraph: false,
  focusMode: false,
  fullScreenReading: false,
  stickyToc: true,
  miniMap: true,
  readingAchievements: true,
  narrationSpeed: 1,
  narrationVoice: "",
  highlightWhileNarrating: true,
  imageQuality: "high",
  clickToZoomImages: true,
  showVocabulary: true,
  difficultWordsOnly: false,
  vocabDifficulty: "all",
  showPronunciation: true,
  showEtymology: false,
  autoSaveLearnedWords: true,
  showKeyTakeaways: true,
  enableQuizzes: true,
  quizDifficulty: "all",
  reflectionPrompts: true,
  biggerPicture: true,
  continueWhereLeftOff: true,
  rememberScrollPosition: true,
  summaryLength: "standard",
  showRelatedArticles: true,
  showRecommendations: true,
  commentSort: "newest",
  commentView: "flat",
  dataSaver: false,
  lazyLoadImages: true,
  preloadNextArticle: true,
  offlineReading: false,
  enableTextHighlighting: true,
  eyeComfortMode: false,
  adaptiveFontSize: false,
  focusTimer: false,
  immersiveMode: false,
  zenMode: false,
  keyboardNavigation: true,
  screenReaderOptimization: false,
};

export const FONT_SIZE_PX: Record<FontSize, string> = {
  xs: "14px",
  sm: "16px",
  md: "18px",
  lg: "20px",
  xl: "22px",
  xxl: "24px",
};

export const FONT_FAMILY_STACK: Record<FontFamily, string> = {
  default: "Georgia, 'Times New Roman', serif",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  dyslexia: "'OpenDyslexic', 'Comic Sans MS', system-ui, sans-serif",
  newspaper: "'Playfair Display', Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', 'Fira Code', 'Courier New', monospace",
};

export const FONT_WEIGHT_CSS: Record<FontWeight, number> = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
};

export const LINE_HEIGHT_CSS: Record<LineSpacing, string> = {
  compact: "1.4",
  normal: "1.6",
  relaxed: "1.8",
  loose: "2.0",
};

export const PARAGRAPH_SPACING_CSS: Record<ParagraphSpacing, string> = {
  compact: "0.5em",
  normal: "1em",
  spacious: "1.5em",
};

export const READING_WIDTH_CSS: Record<ReadingWidth, string> = {
  narrow: "540px",
  medium: "680px",
  wide: "820px",
  full: "100%",
};

export type ReadingNote = {
  id: string;
  article_slug: string;
  selected_text: string;
  note: string | null;
  color: string;
  created_at: string;
};

export type ReadingProgress = {
  article_slug: string;
  scroll_percent: number;
  read_seconds: number;
  updated_at: string;
};
