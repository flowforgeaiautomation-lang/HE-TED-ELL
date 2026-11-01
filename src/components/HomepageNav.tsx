import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { HOMEPAGE_CATEGORIES, COUNTRIES } from "@/lib/categories";

interface HomepageNavProps {
  activeCategory?: string;
  activeCountry?: string;
  onCategoryChange?: (category: string | undefined) => void;
  onCountryChange?: (country: string | undefined) => void;
  onExploreAllClick?: () => void;
}

function getIconComponent(iconName: string): React.ComponentType<any> | null {
  const pascalCaseName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return (Icons as any)[pascalCaseName] || null;
}

const mainCategories = [
  { slug: "all", label: "All", icon: "grid" },
  ...HOMEPAGE_CATEGORIES.map(cat => ({
    slug: cat.slug,
    label: cat.label,
    icon: cat.icon,
  })),
];

const countryEntries = Object.entries(COUNTRIES).sort((a, b) => a[1].name.localeCompare(b[1].name));

export function HomepageNav({ activeCategory, activeCountry, onCategoryChange, onCountryChange, onExploreAllClick }: HomepageNavProps) {
  const navigate = useNavigate();
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleCategoryClick = (slug: string) => {
    const categoryValue = slug === "all" ? undefined : slug;
    if (onCategoryChange) {
      onCategoryChange(categoryValue);
      return;
    }
    navigate({ to: "/discover", search: { category: categoryValue } });
  };

  const handleCountryClick = (code: string | undefined) => {
    setCountryOpen(false);
    if (onCountryChange) {
      onCountryChange(code);
      return;
    }
    if (code) {
      window.localStorage.setItem("tuh-country", code);
      window.dispatchEvent(new Event("tuh-preferences"));
      navigate({ to: "/", search: { country: code } });
    } else {
      window.localStorage.removeItem("tuh-country");
      window.dispatchEvent(new Event("tuh-preferences"));
      navigate({ to: "/", search: { country: undefined } });
    }
  };

  const activeCountryName = activeCountry && activeCountry !== "WORLD"
    ? COUNTRIES[activeCountry]?.name ?? activeCountry
    : null;

  return (
    <div className="py-4 border-b rule mb-8">
      <div className="w-full">
        {/* Category buttons — horizontal scroll on mobile, wrapped flex on desktop */}
        <div className="flex flex-wrap justify-center gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2 lg:pb-0">
          {mainCategories.map(cat => {
            const isActive = activeCategory === (cat.slug === "all" ? undefined : cat.slug);
            const Icon = getIconComponent(cat.icon);

            return (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest whitespace-nowrap transition-colors shrink-0 ${
                  isActive ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {cat.label}
              </button>
            );
          })}

          {/* Countries dropdown */}
          <div className="relative shrink-0" ref={countryRef}>
            <button
              onClick={() => setCountryOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest whitespace-nowrap transition-colors ${
                activeCountryName ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"
              }`}
            >
              <Icons.Globe className="h-3.5 w-3.5" />
              {activeCountryName ?? "Countries"}
              <Icons.ChevronDown className="h-3 w-3" />
            </button>
            {countryOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 max-h-[60vh] overflow-y-auto min-w-[200px] border rule bg-background shadow-xl">
                <button
                  onClick={() => handleCountryClick(undefined)}
                  className={`w-full text-left px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition ${
                    !activeCountryName ? "bg-foreground text-background" : ""
                  }`}
                >
                  Global — All Countries
                </button>
                {countryEntries.map(([code, info]) => (
                  <button
                    key={code}
                    onClick={() => handleCountryClick(code)}
                    className={`w-full text-left px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition flex items-center gap-2 ${
                      activeCountry === code ? "bg-foreground text-background" : ""
                    }`}
                  >
                    <span>{info.flag}</span>
                    {info.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onExploreAllClick ? (
            <button
              onClick={onExploreAllClick}
              className="flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest whitespace-nowrap hover:bg-foreground hover:text-background transition shrink-0"
            >
              Explore All
              <Icons.ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              to="/discover"
              search={{ category: undefined }}
              className="flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest whitespace-nowrap hover:bg-foreground hover:text-background transition shrink-0"
            >
              Explore All
              <Icons.ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
