import { useState, useRef, useEffect, useCallback } from "react";
import { SmartImage } from "./SmartImage";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MediaItem = {
  type: "image";
  src: string;
  alt: string;
};

type MediaCarouselProps = {
  media: MediaItem[];
  alt: string;
  priority?: boolean;
};

export function MediaCarousel({ media, alt, priority = false }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const count = media.length;
  const canSwipe = count > 1;

  const go = useCallback((dir: number) => {
    setIndex((i) => (i + dir + count) % count);
  }, [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  function onPointerDown(e: React.PointerEvent) {
    if (!canSwipe) return;
    setIsDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (!isDragging) return;
    const threshold = 60;
    if (dragX < -threshold) go(1);
    else if (dragX > threshold) go(-1);
    setIsDragging(false);
    setDragX(0);
  }

  if (count === 0) return null;

  return (
    <figure className="group relative overflow-hidden rounded-sm bg-foreground/[0.04]">
      <div
        ref={containerRef}
        className="relative w-full max-h-[72vh] overflow-hidden touch-pan-y select-none"
        style={{ aspectRatio: "1200 / 750" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${isDragging ? dragX : 0}px))`,
            transition: isDragging ? "none" : "transform 400ms cubic-bezier(0.2, 0.7, 0.2, 1)",
          }}
        >
          {media.map((item, i) => (
            <div key={i} className="relative h-full w-full shrink-0">
              <SmartImage
                src={item.src}
                alt={i === index ? alt : ""}
                loading={i === 0 && priority ? "eager" : "lazy"}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>

        {canSwipe && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-foreground/10 text-foreground/70 hover:bg-background hover:text-foreground transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); go(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-foreground/10 text-foreground/70 hover:bg-background hover:text-foreground transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-background" : "w-1.5 bg-background/40 hover:bg-background/60"}`}
                  aria-label={`Go to item ${i + 1}`}
                />
              ))}
            </div>

            <div className="absolute top-4 right-4 z-10 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-foreground/70 tabular-nums">
              {index + 1} / {count}
            </div>
          </>
        )}
      </div>

      <figcaption className="px-5 py-4 text-xs text-muted-foreground italic leading-relaxed border-t border-foreground/[0.06]">
        {alt}
      </figcaption>
    </figure>
  );
}
