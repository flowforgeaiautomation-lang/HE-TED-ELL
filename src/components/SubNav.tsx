import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LayoutGrid, MoreHorizontal, BookOpen, Sparkles } from "lucide-react";
import { CategoryModal } from "./CategoryModal";

const NAV = [
  { to: "/today", label: "Today" },
  { to: "/briefing", label: "Daily Briefing" },
  { to: "/discovery", label: "Daily Discovery", icon: "sparkles" },
  { to: "/discover", label: "Discover" },
  { to: "/trending", label: "Trending" },
  { to: "/editions", label: "Editions", icon: "book" },
  { to: "/information", label: "Information" },
  { to: "/bookmarks", label: "Library" },
];

/**
 * Site-wide secondary bar shown directly under the masthead on every page.
 * Left:  "Menu" dropdown (Today, Daily Briefing, Discover, Trending, Information, Library)
 * Right: "Categories" button — opens the full Explore-All-Fields modal.
 * Desktop layout above is unchanged; this row is additive on every page.
 */
export function SubNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="border-b rule bg-background/95">
      <div className="container-edit overflow-x-auto scrollbar-hide py-3">
        <div className="flex min-w-max items-center justify-between gap-2 sm:gap-3">
        {/* Left: Menu dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 border border-foreground/80 px-2.5 sm:px-3 py-1.5 text-[0.68rem] sm:text-[0.72rem] uppercase tracking-[0.14em] sm:tracking-[0.18em] hover:bg-foreground hover:text-background transition whitespace-nowrap"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open all pages menu"
            title="All pages"
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Menu</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70 shrink-0" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-2 z-50 min-w-[220px] border rule bg-background shadow-xl"
            >
              <ul className="py-2">
                {NAV.map((n) => (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-[0.78rem] uppercase tracking-[0.16em] hover:bg-foreground hover:text-background transition"
                    >
                      {n.to === "/editions" && <BookOpen className="h-3.5 w-3.5 shrink-0" />}
                      {n.to === "/discovery" && <Sparkles className="h-3.5 w-3.5 shrink-0" />}
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <nav className="hidden lg:flex items-center gap-4 ml-auto" aria-label="Primary sections">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.12em] whitespace-nowrap hover:underline underline-offset-4"
            >
              {item.to === "/discovery" && <Sparkles className="h-3 w-3 shrink-0" />}
              {item.to === "/editions" && <BookOpen className="h-3 w-3 shrink-0" />}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-0">
          <Link
            to="/discovery"
            className="flex items-center gap-1 border border-foreground px-2.5 sm:px-3 py-1.5 text-[0.68rem] sm:text-[0.72rem] uppercase tracking-[0.14em] sm:tracking-[0.18em] bg-foreground text-background hover:bg-transparent hover:text-foreground transition rounded-full whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Daily Discovery</span>
            <span className="sm:hidden">Daily Discovery</span>
          </Link>
          <button
            onClick={() => setCatOpen(true)}
            aria-label="Open categories"
            className="flex items-center gap-1.5 border border-foreground/80 px-2.5 sm:px-3 py-1.5 text-[0.68rem] sm:text-[0.72rem] uppercase tracking-[0.14em] sm:tracking-[0.18em] hover:bg-foreground hover:text-background transition whitespace-nowrap"
          >
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
            Categories
          </button>
        </div>
        </div>
      </div>
      <CategoryModal isOpen={catOpen} onClose={() => setCatOpen(false)} />
    </div>
  );
}
