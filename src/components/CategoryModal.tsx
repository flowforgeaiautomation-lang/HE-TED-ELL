import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import * as Icons from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { CATEGORY_SECTIONS } from "@/lib/categories";

const sectionIconMap: Record<string, ComponentType<any>> = {
  "TRENDING & NEWS": Icons.TrendingUp,
  "WORLD & DISCOVERY": Icons.Globe,
  "POLITICS & GOVERNANCE": Icons.Building2,
  "MONEY & SUCCESS": Icons.TrendingUp,
  "TECHNOLOGY & AI": Icons.Zap,
  "SPACE & THE UNIVERSE": Icons.Sparkles,
  "SCIENCE": Icons.FlaskConical,
  "WILDLIFE & NATURE": Icons.Trees,
  "OCEANS": Icons.Waves,
  "HISTORY": Icons.History,
  "MYSTERIES": Icons.Search,
  "BOOKS & KNOWLEDGE": Icons.BookOpen,
  "CULTURE & ARTS": Icons.Palette,
  "ENTERTAINMENT": Icons.Film,
  "SPORTS": Icons.Trophy,
  "HEALTH": Icons.Heart,
  "HUMANITY": Icons.Users,
  "PHILOSOPHY & SPIRITUALITY": Icons.Sprout,
  "EDUCATION": Icons.GraduationCap,
  "CAREERS & OPPORTUNITIES": Icons.Briefcase,
  "ENERGY": Icons.Zap,
  "ENVIRONMENT": Icons.Leaf,
  "CITIES & MEGAPROJECTS": Icons.Building2,
  "TRANSPORTATION": Icons.Train,
  "LUXURY": Icons.Crown,
  "FUTURE OF HUMANITY": Icons.Rocket,
  "STORIES": Icons.BookMarked,
  "CURIOSITY": Icons.Star,
  "INDIA": Icons.MapPin,
  "SPECIAL COLLECTIONS": Icons.Award,
  "FOOD & CULINARY CULTURE": Icons.Utensils,
  "ENGINEERING & INVENTIONS": Icons.Wrench,
  "LEADERS & ICONS": Icons.Crown,
  "MYTHOLOGY & LEGENDS": Icons.Sparkles,
  "RARE & EXTRAORDINARY": Icons.Gem,
  "RANKINGS": Icons.Trophy,
  "DATA & VISUAL INTELLIGENCE": Icons.BarChart3,
  "WORLD EXPLORER": Icons.Globe2,
  "STORY EVOLUTION": Icons.History,
};

function getIconComponent(iconName: string): ComponentType<any> | null {
  const pascalCaseName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return (Icons as any)[pascalCaseName] || null;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4">
      <div ref={modalRef} className="bg-background border rule w-full h-[100dvh] sm:h-auto sm:max-w-7xl sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-lg shadow-2xl flex flex-col">
        <div className="shrink-0 bg-background border-b rule p-4 sm:p-6 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl">Explore All Fields</h2>
            
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70 transition">
            <Icons.X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-9 pb-28 sm:pb-6">
          {CATEGORY_SECTIONS.map((section, sectionIndex) => {
            const SectionIcon = sectionIconMap[section.title];
            return (
              <div key={sectionIndex}>
                <div className="kicker mb-4 flex items-center gap-2">
                  {SectionIcon && <SectionIcon className="h-4 w-4" />}
                  {section.title}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                  {section.categories.map((category) => {
                    const IconComponent = getIconComponent(category.icon);
                    return (
                      <button
                        key={category.slug}
                        onClick={() => {
                          onClose();
                          navigate({ to: "/discover", search: { category: category.slug } });
                        }}
                        className="min-w-0 px-3 sm:px-4 py-2 border rule hover:bg-foreground hover:text-background transition text-sm font-medium flex items-center gap-2 text-left"
                      >
                        {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
                        <span className="min-w-0 truncate">{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
