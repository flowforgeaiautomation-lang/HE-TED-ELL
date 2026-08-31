import {
  type ReadingPreferences,
  FONT_SIZE_PX,
  FONT_FAMILY_STACK,
  FONT_WEIGHT_CSS,
  LINE_HEIGHT_CSS,
  PARAGRAPH_SPACING_CSS,
  READING_WIDTH_CSS,
  type Theme,
} from "@/lib/reading-prefs";

const THEME_CLASSES: Record<Theme, string> = {
  light: "tuh-theme-light",
  dark: "tuh-theme-dark",
  system: "tuh-theme-system",
  sepia: "tuh-theme-sepia",
  paper: "tuh-theme-paper",
  midnight: "tuh-theme-midnight",
  "high-contrast": "tuh-theme-high-contrast",
};

const ALL_THEME_CLASSES = Object.values(THEME_CLASSES);
const ALL_A11Y_CLASSES = [
  "tuh-high-contrast",
  "tuh-dyslexia-font",
  "tuh-reduce-motion",
  "tuh-reduce-animations",
  "tuh-touch-targets",
  "tuh-underline-links",
  "tuh-larger-icons",
  "tuh-focus-highlight",
  "tuh-color-blind",
  "tuh-eye-comfort",
  "tuh-focus-mode",
  "tuh-keyboard-nav",
  "tuh-screen-reader",
  "tuh-data-saver",
  "tuh-immersive",
  "tuh-zen",
];

export function applyReadingPrefs(prefs: ReadingPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // CSS variables for typography & layout
  root.style.setProperty("--article-font-size", FONT_SIZE_PX[prefs.fontSize]);
  root.style.setProperty("--article-font-family", FONT_FAMILY_STACK[prefs.dyslexiaFont ? "dyslexia" : prefs.fontFamily]);
  root.style.setProperty("--article-font-weight", String(FONT_WEIGHT_CSS[prefs.fontWeight]));
  root.style.setProperty("--article-line-height", LINE_HEIGHT_CSS[prefs.lineSpacing]);
  root.style.setProperty("--article-paragraph-spacing", PARAGRAPH_SPACING_CSS[prefs.paragraphSpacing]);
  root.style.setProperty("--article-max-width", READING_WIDTH_CSS[prefs.readingWidth]);
  root.style.setProperty("--article-text-align", prefs.textAlignment === "justify" ? "justify" : "left");
  root.style.setProperty("--article-indent", prefs.indentFirstParagraph ? "1.5em" : "0");

  // Theme — apply both CSS class AND inline CSS variables for guaranteed override
  ALL_THEME_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.add(THEME_CLASSES[prefs.theme]);

  // Also set inline CSS variables directly — inline styles have highest priority
  const themeVars: Record<Theme, Record<string, string>> = {
    light: {
      "--background": "oklch(0.985 0.003 80)", "--foreground": "oklch(0.16 0.005 270)",
      "--paper": "oklch(0.985 0.003 80)", "--ink": "oklch(0.16 0.005 270)",
      "--rule": "oklch(0.16 0.005 270 / 0.18)", "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.16 0.005 270)", "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.16 0.005 270)", "--primary": "oklch(0.16 0.005 270)",
      "--primary-foreground": "oklch(0.985 0.003 80)", "--secondary": "oklch(0.94 0.003 80)",
      "--secondary-foreground": "oklch(0.16 0.005 270)", "--muted": "oklch(0.95 0.003 80)",
      "--muted-foreground": "oklch(0.42 0.005 270)", "--accent": "oklch(0.92 0.003 80)",
      "--accent-foreground": "oklch(0.16 0.005 270)", "--destructive": "oklch(0.45 0.18 25)",
      "--destructive-foreground": "oklch(0.985 0.003 80)", "--border": "oklch(0.16 0.005 270 / 0.14)",
      "--input": "oklch(0.16 0.005 270 / 0.18)", "--ring": "oklch(0.16 0.005 270 / 0.4)",
    },
    dark: {
      "--background": "oklch(0.18 0.01 250)", "--foreground": "oklch(0.92 0.01 250)",
      "--paper": "oklch(0.18 0.01 250)", "--ink": "oklch(0.92 0.01 250)",
      "--rule": "oklch(0.92 0.01 250 / 0.16)", "--card": "oklch(0.22 0.01 250)",
      "--card-foreground": "oklch(0.92 0.01 250)", "--popover": "oklch(0.2 0.01 250)",
      "--popover-foreground": "oklch(0.92 0.01 250)", "--primary": "oklch(0.92 0.01 250)",
      "--primary-foreground": "oklch(0.18 0.01 250)", "--secondary": "oklch(0.26 0.01 250)",
      "--secondary-foreground": "oklch(0.92 0.01 250)", "--muted": "oklch(0.24 0.01 250)",
      "--muted-foreground": "oklch(0.68 0.01 250)", "--accent": "oklch(0.28 0.01 250)",
      "--accent-foreground": "oklch(0.92 0.01 250)", "--destructive": "oklch(0.58 0.18 25)",
      "--destructive-foreground": "oklch(0.92 0.01 250)", "--border": "oklch(0.92 0.01 250 / 0.14)",
      "--input": "oklch(0.92 0.01 250 / 0.2)", "--ring": "oklch(0.92 0.01 250 / 0.4)",
    },
    system: {}, // uses :root or .dark based on matchMedia
    sepia: {
      "--background": "oklch(0.95 0.02 75)", "--foreground": "oklch(0.3 0.02 60)",
      "--paper": "oklch(0.95 0.02 75)", "--ink": "oklch(0.3 0.02 60)",
      "--rule": "oklch(0.3 0.02 60 / 0.18)", "--card": "oklch(0.93 0.02 75)",
      "--card-foreground": "oklch(0.3 0.02 60)", "--popover": "oklch(0.94 0.02 75)",
      "--popover-foreground": "oklch(0.3 0.02 60)", "--primary": "oklch(0.3 0.02 60)",
      "--primary-foreground": "oklch(0.95 0.02 75)", "--secondary": "oklch(0.88 0.02 75)",
      "--secondary-foreground": "oklch(0.3 0.02 60)", "--muted": "oklch(0.9 0.02 75)",
      "--muted-foreground": "oklch(0.5 0.02 60)", "--accent": "oklch(0.86 0.02 75)",
      "--accent-foreground": "oklch(0.3 0.02 60)", "--destructive": "oklch(0.45 0.18 25)",
      "--destructive-foreground": "oklch(0.95 0.02 75)", "--border": "oklch(0.3 0.02 60 / 0.14)",
      "--input": "oklch(0.3 0.02 60 / 0.18)", "--ring": "oklch(0.3 0.02 60 / 0.4)",
    },
    paper: {
      "--background": "oklch(0.97 0.005 80)", "--foreground": "oklch(0.2 0.01 270)",
      "--paper": "oklch(0.97 0.005 80)", "--ink": "oklch(0.2 0.01 270)",
      "--rule": "oklch(0.2 0.01 270 / 0.16)", "--card": "oklch(0.99 0 0)",
      "--card-foreground": "oklch(0.2 0.01 270)", "--popover": "oklch(0.99 0 0)",
      "--popover-foreground": "oklch(0.2 0.01 270)", "--primary": "oklch(0.2 0.01 270)",
      "--primary-foreground": "oklch(0.97 0.005 80)", "--secondary": "oklch(0.92 0.005 80)",
      "--secondary-foreground": "oklch(0.2 0.01 270)", "--muted": "oklch(0.94 0.005 80)",
      "--muted-foreground": "oklch(0.45 0.01 270)", "--accent": "oklch(0.9 0.005 80)",
      "--accent-foreground": "oklch(0.2 0.01 270)", "--destructive": "oklch(0.45 0.18 25)",
      "--destructive-foreground": "oklch(0.97 0.005 80)", "--border": "oklch(0.2 0.01 270 / 0.14)",
      "--input": "oklch(0.2 0.01 270 / 0.18)", "--ring": "oklch(0.2 0.01 270 / 0.4)",
    },
    midnight: {
      "--background": "oklch(0.1 0.02 270)", "--foreground": "oklch(0.85 0.02 250)",
      "--paper": "oklch(0.1 0.02 270)", "--ink": "oklch(0.85 0.02 250)",
      "--rule": "oklch(0.85 0.02 250 / 0.14)", "--card": "oklch(0.14 0.02 270)",
      "--card-foreground": "oklch(0.85 0.02 250)", "--popover": "oklch(0.12 0.02 270)",
      "--popover-foreground": "oklch(0.85 0.02 250)", "--primary": "oklch(0.85 0.02 250)",
      "--primary-foreground": "oklch(0.1 0.02 270)", "--secondary": "oklch(0.18 0.02 270)",
      "--secondary-foreground": "oklch(0.85 0.02 250)", "--muted": "oklch(0.16 0.02 270)",
      "--muted-foreground": "oklch(0.6 0.02 250)", "--accent": "oklch(0.2 0.02 270)",
      "--accent-foreground": "oklch(0.85 0.02 250)", "--destructive": "oklch(0.58 0.18 25)",
      "--destructive-foreground": "oklch(0.85 0.02 250)", "--border": "oklch(0.85 0.02 250 / 0.12)",
      "--input": "oklch(0.85 0.02 250 / 0.16)", "--ring": "oklch(0.85 0.02 250 / 0.4)",
    },
    "high-contrast": {
      "--background": "oklch(1 0 0)", "--foreground": "oklch(0 0 0)",
      "--paper": "oklch(1 0 0)", "--ink": "oklch(0 0 0)",
      "--rule": "oklch(0 0 0 / 0.5)", "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0 0 0)", "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0 0 0)", "--primary": "oklch(0 0 0)",
      "--primary-foreground": "oklch(1 0 0)", "--secondary": "oklch(0.9 0 0)",
      "--secondary-foreground": "oklch(0 0 0)", "--muted": "oklch(0.95 0 0)",
      "--muted-foreground": "oklch(0.2 0 0)", "--accent": "oklch(0.88 0 0)",
      "--accent-foreground": "oklch(0 0 0)", "--destructive": "oklch(0.45 0.18 25)",
      "--destructive-foreground": "oklch(1 0 0)", "--border": "oklch(0 0 0 / 0.4)",
      "--input": "oklch(0 0 0 / 0.4)", "--ring": "oklch(0 0 0 / 0.6)",
    },
  };

  // Apply theme variables as inline styles (highest CSS priority)
  const vars = themeVars[prefs.theme];
  if (prefs.theme === "system") {
    const isDarkSys = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const sysVars = isDarkSys ? themeVars.dark : themeVars.light;
    Object.entries(sysVars).forEach(([k, v]) => root.style.setProperty(k, v));
  } else {
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  // Sync .dark class so Tailwind's dark: variant and the full .dark variable set apply
  const isDark = prefs.theme === "dark" || prefs.theme === "midnight" ||
    (prefs.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);

  // Accessibility classes
  ALL_A11Y_CLASSES.forEach((c) => root.classList.remove(c));
  if (prefs.highContrast) root.classList.add("tuh-high-contrast");
  if (prefs.dyslexiaFont) root.classList.add("tuh-dyslexia-font");
  if (prefs.reduceMotion) root.classList.add("tuh-reduce-motion");
  if (prefs.reduceAnimations) root.classList.add("tuh-reduce-animations");
  if (prefs.increaseTouchTargets) root.classList.add("tuh-touch-targets");
  if (prefs.underlineLinks) root.classList.add("tuh-underline-links");
  if (prefs.largerIcons) root.classList.add("tuh-larger-icons");
  if (prefs.focusHighlight) root.classList.add("tuh-focus-highlight");
  if (prefs.colorBlindFriendly) root.classList.add("tuh-color-blind");
  if (prefs.eyeComfortMode) root.classList.add("tuh-eye-comfort");
  if (prefs.focusMode) root.classList.add("tuh-focus-mode");
  if (prefs.immersiveMode) root.classList.add("tuh-immersive");
  if (prefs.zenMode) root.classList.add("tuh-zen");
  if (prefs.keyboardNavigation) root.classList.add("tuh-keyboard-nav");
  if (prefs.screenReaderOptimization) root.classList.add("tuh-screen-reader");
  if (prefs.dataSaver) root.classList.add("tuh-data-saver");
}
