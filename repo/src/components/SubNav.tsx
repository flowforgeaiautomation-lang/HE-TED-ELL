import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LayoutGrid, Menu as MenuIcon } from "lucide-react";
import { CategoryModal } from "./CategoryModal";

const NAV = [
  { to: "/", label: "Today" },
  { to: "/briefing", label: "Daily Briefing" },
  { to: "/discover", label: "Discover" },
  { to: "/world", label: "World" },
  { to: "/trending", label: "Trending" },
  { to: "/information", label: "Information" },
  { to: "/bookmarks", label: "Library" },
];

/**
 * Site-wide secondary bar shown directly under the masthead on every page.
 * Left:  "Menu" dropdown (Today, Daily Briefing, Discover, World, Trending, Information, Library)
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
      <div className="container-edit flex items-center justify-between gap-3 py-3">
        {/* Left: Menu dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 border border-foreground/80 px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon className="h-3.5 w-3.5" />
            Today
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
                      className="block px-4 py-2.5 text-[0.78rem] uppercase tracking-[0.16em] hover:bg-foreground hover:text-background transition"
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Categories popup */}
        <button
          onClick={() => setCatOpen(true)}
          className="flex items-center gap-2 border border-foreground/80 px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Categories
        </button>
      </div>
      <CategoryModal isOpen={catOpen} onClose={() => setCatOpen(false)} />
    </div>
  );
}
