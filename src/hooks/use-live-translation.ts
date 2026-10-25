import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { translateVisibleText } from "@/lib/translation.functions";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "NOSCRIPT"]);

function currentLanguage() {
  return window.localStorage.getItem("tuh-language") || "en";
}

async function clientGoogleTranslate(text: string, target: string): Promise<string | null> {
  try {
    const truncated = text.slice(0, 4500);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(truncated)}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
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

async function clientTranslateBatch(texts: string[], target: string): Promise<Record<string, string>> {
  const results = await Promise.all(texts.map((t) => clientGoogleTranslate(t, target)));
  const map: Record<string, string> = {};
  for (let i = 0; i < texts.length; i++) {
    if (results[i]) map[texts[i]] = results[i]!;
  }
  return map;
}

function showTranslationBanner(msg: string, isError: boolean) {
  const existing = document.getElementById("tuh-translation-banner");
  if (existing) existing.remove();
  const banner = document.createElement("div");
  banner.id = "tuh-translation-banner";
  banner.style.cssText = `position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;padding:8px 20px;border-radius:6px;font-size:14px;font-family:system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.15);${isError ? "background:#fee;color:#c33;border:1px solid #c33;" : "background:#1f1b16;color:#fbf8f0;border:1px solid #1f1b16;"}transition:opacity 0.3s;`;
  banner.textContent = msg;
  document.body.appendChild(banner);
  if (isError) setTimeout(() => { banner.style.opacity = "0"; setTimeout(() => banner.remove(), 300); }, 4000);
}

function removeTranslationBanner() {
  const existing = document.getElementById("tuh-translation-banner");
  if (existing) existing.remove();
}

export function useLiveTranslation() {
  const translate = useServerFn(translateVisibleText);
  const router = useRouter();
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let scheduled: number | null = null;

    async function applyTranslation() {
      const lang = currentLanguage();
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" || lang === "he" ? "rtl" : "ltr";

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          const text = node.textContent?.trim() ?? "";
          if (!parent || SKIP_TAGS.has(parent.tagName) || text.length < 2 || /^\d+$/.test(text)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);

      if (lang === "en") {
        for (const node of nodes) {
          const original = node.parentElement?.dataset.originalText;
          if (original) node.textContent = original;
        }
        removeTranslationBanner();
        return;
      }

      const originals = nodes.map((node) => {
        const parent = node.parentElement!;
        if (!parent.dataset.originalText) parent.dataset.originalText = node.textContent?.trim() ?? "";
        return parent.dataset.originalText;
      });
      const unique = [...new Set(originals)];
      if (!unique.length) return;

      setTranslating(true);
      showTranslationBanner("Translating…", false);

      const allTranslations: Record<string, string> = {};
      const BATCH = 30;
      let failedBatches = 0;
      const totalBatches = Math.ceil(unique.length / BATCH);

      for (let i = 0; i < unique.length; i += BATCH) {
        const batch = unique.slice(i, i + BATCH);

        // Try client-side Google Translate first
        try {
          const clientResult = await clientTranslateBatch(batch, lang);
          if (cancelled) return;
          const clientCount = Object.keys(clientResult).length;
          if (clientCount >= Math.ceil(batch.length * 0.3)) {
            Object.assign(allTranslations, clientResult);
            for (const node of nodes) {
              const original = node.parentElement?.dataset.originalText;
              if (original && allTranslations[original]) node.textContent = allTranslations[original];
            }
            continue;
          }
        } catch { /* fall through to server */ }

        // Fall back to server-side translation
        try {
          const result = await translate({ data: { target: lang as never, texts: batch } });
          if (cancelled) return;
          Object.assign(allTranslations, result);
          for (const node of nodes) {
            const original = node.parentElement?.dataset.originalText;
            if (original && allTranslations[original]) node.textContent = allTranslations[original];
          }
        } catch (err) {
          failedBatches++;
          console.error("[translation] batch failed:", err);
        }
      }

      if (cancelled) return;
      for (const node of nodes) {
        const original = node.parentElement?.dataset.originalText;
        if (original && allTranslations[original]) node.textContent = allTranslations[original];
      }
      setTranslating(false);
      if (failedBatches === totalBatches && totalBatches > 0) {
        showTranslationBanner("Translation unavailable. Showing original.", true);
      } else if (failedBatches > 0) {
        showTranslationBanner("Partially translated. Some sections may show original text.", true);
      } else {
        removeTranslationBanner();
      }
    }

    const run = () => {
      if (scheduled !== null) window.clearTimeout(scheduled);
      scheduled = window.setTimeout(applyTranslation, 200);
    };
    run();

    window.addEventListener("tuh-preferences", run);
    window.addEventListener("tuh-language-change", run);

    const unsubscribe = router.subscribe("onResolved", () => run());

    return () => {
      cancelled = true;
      if (scheduled !== null) window.clearTimeout(scheduled);
      window.removeEventListener("tuh-preferences", run);
      window.removeEventListener("tuh-language-change", run);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [translate, router]);

  return { translating };
}
