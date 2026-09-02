import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type ReadingPreferences,
  DEFAULT_READING_PREFS,
} from "@/lib/reading-prefs";
import { applyReadingPrefs } from "@/lib/apply-reading-prefs";

const LS_KEY = "tuh-reading-prefs";

// ── Module-level singleton store ─────────────────────────────────────────────
// All components share one source of truth so theme toggles from the header
// are immediately visible everywhere and never overwritten by a stale copy.

let currentPrefs: ReadingPreferences = { ...DEFAULT_READING_PREFS };
let currentSignedIn = false;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setPrefsInternal(next: ReadingPreferences, applyNow = true) {
  currentPrefs = next;
  if (applyNow && typeof document !== "undefined") {
    applyReadingPrefs(next);
  }
  emit();
}

function loadFromLS(): Partial<ReadingPreferences> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToLS(prefs: ReadingPreferences) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {}
}

async function initStore() {
  if (initialized) return;
  initialized = true;

  const { data: sessionData } = await supabase.auth.getSession();
  const isSignedIn = !!sessionData.session;
  currentSignedIn = isSignedIn;

  if (isSignedIn) {
    const { data, error } = await supabase
      .from("reading_preferences")
      .select("prefs")
      .maybeSingle();

    if (data?.prefs && !error) {
      setPrefsInternal({ ...DEFAULT_READING_PREFS, ...(data.prefs as Partial<ReadingPreferences>) });
    } else {
      const ls = loadFromLS();
      if (Object.keys(ls).length > 0) {
        const merged = { ...DEFAULT_READING_PREFS, ...ls };
        setPrefsInternal(merged);
        await supabase.from("reading_preferences").upsert({
          user_id: sessionData.session!.user.id,
          prefs: merged,
        });
        window.localStorage.removeItem(LS_KEY);
      } else {
        setPrefsInternal({ ...DEFAULT_READING_PREFS });
      }
    }
  } else {
    const ls = loadFromLS();
    setPrefsInternal({ ...DEFAULT_READING_PREFS, ...ls });
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      currentSignedIn = true;
      (async () => {
        const ls = loadFromLS();
        const { data } = await supabase
          .from("reading_preferences")
          .select("prefs")
          .maybeSingle();
        if (data?.prefs) {
          const merged = { ...DEFAULT_READING_PREFS, ...(data.prefs as Partial<ReadingPreferences>), ...ls };
          setPrefsInternal(merged);
          await supabase.from("reading_preferences").upsert({
            user_id: session.user.id,
            prefs: merged,
          });
          window.localStorage.removeItem(LS_KEY);
        } else if (Object.keys(ls).length > 0) {
          const merged = { ...DEFAULT_READING_PREFS, ...ls };
          setPrefsInternal(merged);
          await supabase.from("reading_preferences").upsert({
            user_id: session.user.id,
            prefs: merged,
          });
          window.localStorage.removeItem(LS_KEY);
        }
      })();
    } else if (event === "SIGNED_OUT") {
      currentSignedIn = false;
      setPrefsInternal({ ...DEFAULT_READING_PREFS, ...loadFromLS() });
    }
  });
}

// Start init immediately (idempotent)
if (typeof window !== "undefined") {
  initStore();

  // Cross-tab sync: when another tab changes the prefs in localStorage, update our store
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        setPrefsInternal({ ...DEFAULT_READING_PREFS, ...parsed });
      } catch {}
    }
  });

  // System theme change listener — when OS switches between light/dark,
  // re-apply prefs so "system" theme picks up the new mode
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentPrefs.theme === "system") {
      setPrefsInternal(currentPrefs);
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentPrefs;
}

function getServerSnapshot() {
  return DEFAULT_READING_PREFS;
}

/**
 * useReadingPrefs — single source of truth for reading preferences.
 * Uses a module-level singleton so all components share the same state.
 */
export function useReadingPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((patch: Partial<ReadingPreferences>) => {
    const next = { ...currentPrefs, ...patch };
    setPrefsInternal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (currentSignedIn) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) {
          await supabase.from("reading_preferences").upsert({
            user_id: s.session.user.id,
            prefs: next,
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        saveToLS(next);
      }
    }, 300);
  }, []);

  const reset = useCallback(() => {
    setPrefsInternal({ ...DEFAULT_READING_PREFS });
    if (currentSignedIn) {
      (async () => {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) {
          await supabase.from("reading_preferences").upsert({
            user_id: s.session.user.id,
            prefs: DEFAULT_READING_PREFS,
            updated_at: new Date().toISOString(),
          });
        }
      })();
    } else {
      window.localStorage.removeItem(LS_KEY);
    }
  }, []);

  const exportPrefs = useCallback(() => {
    const blob = new Blob([JSON.stringify(currentPrefs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tuh-reading-prefs.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importPrefs = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      update({ ...DEFAULT_READING_PREFS, ...parsed });
    } catch {
      throw new Error("Invalid preferences file");
    }
  }, [update]);

  return { prefs, update, reset, exportPrefs, importPrefs, loaded: initialized, signedIn: currentSignedIn };
}
