import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { HOMEPAGE_CATEGORIES } from "@/lib/categories";

interface HomepageNavProps {
  activeCategory?: string;
  onCategoryChange?: (category: string | undefined) => void;
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

export function HomepageNav({ activeCategory, onCategoryChange, onExploreAllClick }: HomepageNavProps) {
  const navigate = useNavigate();
  
  const handleCategoryClick = (slug: string) => {
    const categoryValue = slug === "all" ? undefined : slug;
    if (onCategoryChange) {
      onCategoryChange(categoryValue);
      return;
    }
    navigate({ to: "/discover", search: { category: categoryValue } });
  };

  return (
    <div className="py-8 border-b rule mb-10">
      <div className="container-edit">
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {mainCategories.map(cat => {
            const isActive = activeCategory === (cat.slug === "all" ? undefined : cat.slug);
            const Icon = getIconComponent(cat.icon);

            return (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`flex items-center gap-2 px-4 py-2 border rule transition-colors ${isActive ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {cat.label}
              </button>
            );
          })}
          {onExploreAllClick ? (
            <button
              onClick={onExploreAllClick}
              className="flex items-center gap-2 px-4 py-2 border rule hover:bg-foreground hover:text-background transition"
            >
              Explore All Fields
              <Icons.ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/discover"
              search={{ category: undefined }}
              className="flex items-center gap-2 px-4 py-2 border rule hover:bg-foreground hover:text-background transition"
            >
              Explore All Fields
              <Icons.ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
