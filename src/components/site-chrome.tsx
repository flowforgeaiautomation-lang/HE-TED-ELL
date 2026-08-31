import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Moon, Sun, Menu, X, User, BookOpen, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PanchangDisplay } from "./PanchangDisplay";
import { SubNav } from "./SubNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useReadingPrefs } from "@/hooks/use-reading-prefs";
import { applyReadingPrefs } from "@/lib/apply-reading-prefs";



const NAV = [
  { to: "/", label: "Today", icon: undefined },
  { to: "/briefing", label: "Daily Briefing", icon: undefined },
  { to: "/discover", label: "Discover", icon: undefined },
  { to: "/trending", label: "Trending", icon: undefined },
  { to: "/editions", label: "Editions", icon: "BookOpen" },
  { to: "/information", label: "Information", icon: undefined },
];

export function SiteHeader() {
  const { prefs, update } = useReadingPrefs();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(false);
  const ticking = useRef(false);

  const isDark = prefs.theme === "dark" || prefs.theme === "midnight" ||
    (prefs.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    applyReadingPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const lastScrollYRef = useRef(0);
  const isHiddenRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > 100) {
          if (currentScrollY > lastScrollYRef.current && !isHiddenRef.current) {
            setIsHidden(true);
            isHiddenRef.current = true;
          } else if (currentScrollY < lastScrollYRef.current && isHiddenRef.current) {
            setIsHidden(false);
            isHiddenRef.current = false;
          }
        } else {
          setIsHidden(false);
          isHiddenRef.current = false;
        }
        lastScrollYRef.current = currentScrollY;
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    update({ theme: nextTheme });
  }


  return (
    <header
      className={`glass-header border-b rule sticky top-0 z-40 transition-transform duration-300 ${isHidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="container-edit">
        {/* Masthead */}
        <div className="flex items-center justify-between py-4 lg:py-6 gap-2 lg:gap-3">
          {/* Left side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop date (3-line Panchang) */}
            <div className="hidden lg:block">
              <PanchangDisplay />
            </div>
            {/* Mobile / tablet hamburger */}
            <button
              aria-label="menu"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden p-1.5 border border-foreground/30 hover:bg-foreground hover:text-background transition"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          {/* Center: Title (takes remaining space) */}
          <div className="flex-1 min-w-0 flex items-center justify-center text-center px-1">
            <Link to="/" search={{ category: undefined }} className="inline-block max-w-full">
              <div className="font-serif text-[1.05rem] sm:text-xl lg:text-5xl font-semibold tracking-tight leading-tight uppercase truncate">
                THE UNITED HELL
              </div>
              <div className="dek text-[0.55rem] sm:text-[0.65rem] lg:text-sm mt-0.5 lg:mt-1 not-italic font-sans tracking-wide text-muted-foreground truncate">
                Beyond comfort. Beyond headlines.
              </div>
            </Link>
          </div>

          {/* Right: Translate control (always visible, prominent) + Icons */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0 justify-end">
            <div className="flex items-center order-first sm:order-none">
              <LanguageSwitcher />
            </div>
            <Link to="/search" search={{ q: "" }} aria-label="search" className="hidden lg:inline-block p-2 hover:opacity-70">
              <Search className="h-4 w-4" />
            </Link>
            <button
              onClick={toggleTheme}
              aria-label="theme"
              className="hidden lg:inline-block p-2 hover:opacity-70"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {signedIn ? (
              <Link to="/dashboard" className="hidden lg:inline-block p-2 hover:opacity-70" aria-label="dashboard">
                <User className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="ml-1 hidden lg:inline-block border border-foreground px-3 py-1.5 text-xs font-medium uppercase tracking-widest hover:bg-foreground hover:text-background transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Desktop primary nav — unchanged */}
        <nav className="hidden lg:block border-t rule">
          <ul className="flex lg:justify-center lg:gap-10 py-3 text-[0.82rem] uppercase tracking-[0.18em] font-medium">
            {NAV.map((n) => {
              const active = router.state.location.pathname === n.to;
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    preload="intent"
                    className={`flex items-center gap-1.5 py-1 hover:opacity-60 ${active ? "underline underline-offset-8 decoration-1" : ""}`}
                  >
                    {n.icon === "BookOpen" && <BookOpen className="h-3.5 w-3.5" />}
                    {n.label}
                  </Link>
                </li>
              );
            })}
            {signedIn && (
              <li>
                <Link to="/dashboard" className="block py-1 hover:opacity-60">
                  Dashboard
                </Link>
              </li>
            )}
            {signedIn && (
              <li>
                <Link to="/bookmarks" className="block py-1 hover:opacity-60">
                  Library
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Mobile / tablet hamburger panel */}
        {open && (
          <div className="lg:hidden border-t rule py-5 max-h-[75vh] overflow-y-auto">
            {/* 3-line Panchang date, same as desktop */}
            <div className="mb-5">
              <PanchangDisplay />
            </div>
            <ul className="flex flex-col gap-4 text-[0.82rem] uppercase tracking-[0.18em] font-medium">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} onClick={() => setOpen(false)} className="block py-1 hover:opacity-60">
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/search" search={{ q: "" }} onClick={() => setOpen(false)} className="flex items-center gap-3 py-1 hover:opacity-60">
                  <Search className="h-4 w-4" /> Search
                </Link>
              </li>
              <li>
                <Link to="/editions" onClick={() => setOpen(false)} className="flex items-center gap-3 py-1 hover:opacity-60">
                  <BookOpen className="h-4 w-4" /> Editions
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="flex items-center gap-3 py-1 hover:opacity-60 w-full text-left uppercase tracking-[0.18em]"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Dark
                </button>
              </li>
              <li>
                <div className="flex items-center gap-3 py-1 uppercase tracking-[0.18em]">
                  <Languages className="h-4 w-4" /> Translate
                </div>
                <div className="pl-7">
                  <LanguageSwitcher />
                </div>
              </li>
              <li>
                {signedIn ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-1 hover:opacity-60"
                  >
                    <User className="h-4 w-4" /> Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-1 hover:opacity-60"
                  >
                    <User className="h-4 w-4" /> Sign in
                  </Link>
                )}
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Mobile/tablet only: secondary nav (Today menu + Categories popup). Desktop unchanged. */}
      <div className="lg:hidden">
        <SubNav />
      </div>
    </header>
  );
}

interface SiteFooterProps {
  signedIn?: boolean;
}

export function SiteFooter({ signedIn = false }: SiteFooterProps) {
  return (
    <footer className="border-t rule mt-24 py-12">
      <div className="container-edit grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-serif text-3xl font-semibold tracking-tight leading-none">The United Hell</div>
          <p className="dek mt-2 max-w-md">
            The United Hell brings together the world's most important stories, discoveries, civilizations, innovations, and ideas — transforming information into understanding, curiosity into exploration, and knowledge into progress.
          </p>
        </div>
        <div>
          <div className="kicker mb-3">Sections</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/briefing" className="hover:underline">Daily Earth Briefing</Link></li>
            <li><Link to="/discover" search={{ category: undefined }} className="hover:underline">Discover</Link></li>
            <li><Link to="/trending" className="hover:underline">Trending</Link></li>
            <li><Link to="/editions" className="hover:underline">Editions</Link></li>
            <li><Link to="/information" className="hover:underline">Information & Policies</Link></li>
          </ul>
        </div>
        <div>
          <div className="kicker mb-3">Account</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/dashboard" className="hover:underline">Dashboard</Link></li>
            <li><Link to="/bookmarks" className="hover:underline">My Library</Link></li>
            <li><Link to="/profile" className="hover:underline">Profile</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-edit mt-10 pt-6 border-t rule flex flex-col gap-2 text-xs text-muted-foreground text-center md:text-left">
        <div>© 2026 The United Hell.</div>
        <div>Exploring the world through knowledge, discovery, and truth.</div>
        <div>All rights reserved.</div>
      </div>
    </footer>
  );
}
