import { useState, useEffect, useRef } from "react";

type SmartImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  className?: string;
  placeholder?: string;
  aspectClass?: string;
};

/**
 * Image that displays instantly. Uses a solid neutral background so there is
 * never a blank or vague state. Images are preloaded via the Image constructor
 * and cached by the browser. No fade animation — the image appears the moment
 * it is ready, at full opacity.
 */
export function SmartImage({
  src,
  alt,
  width,
  height,
  loading = "eager",
  className = "",
  placeholder,
  aspectClass = "",
}: SmartImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setError(false);
    setLoaded(false);

    // Preload the image immediately using the Image constructor.
    // This starts the fetch before the <img> tag even mounts.
    const preload = new Image();
    preload.decoding = "sync";
    preload.src = src;
    preload.onload = () => setLoaded(true);
    preload.onerror = () => setError(true);

    return () => {
      preload.onload = null;
      preload.onerror = null;
    };
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden bg-neutral-200 dark:bg-neutral-800 ${aspectClass} ${className}`}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {!error && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: loaded ? 1 : 0.3 }}
        />
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800">
          <svg className="h-8 w-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m21 15-5-5L5 21" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}
