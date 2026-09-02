import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { translateVisibleText } from "@/lib/translation.functions";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "NOSCRIPT"]);

function currentLanguage() {
  return window.localStorage.getItem("tuh-language") || "en";
}

export function useLiveTranslation() {
  const translate = useServerFn(translateVisibleText);

  useEffect(() => {
    let cancelled = false;
    let scheduled: number | null = null;

    async function applyTranslation() {
      const lang = currentLanguage();
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

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
        return;
      }

      const originals = nodes.map((node) => {
        const parent = node.parentElement!;
        if (!parent.dataset.originalText) parent.dataset.originalText = node.textContent?.trim() ?? "";
        return parent.dataset.originalText;
      });
      const unique = [...new Set(originals)].slice(0, 120);
      if (!unique.length) return;
      const translated = await translate({ data: { target: lang as never, texts: unique } });
      if (cancelled) return;
      for (const node of nodes) {
        const original = node.parentElement?.dataset.originalText;
        if (original && translated[original]) node.textContent = translated[original];
      }
    }

    const run = () => {
      if (scheduled !== null) window.clearTimeout(scheduled);
      scheduled = window.setTimeout(applyTranslation, 250);
    };
    run();
    window.addEventListener("tuh-preferences", run);
    return () => {
      cancelled = true;
      if (scheduled !== null) window.clearTimeout(scheduled);
      window.removeEventListener("tuh-preferences", run);
    };
  }, [translate]);
}