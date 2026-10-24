import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseAdProps {
  slot?: string;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function AdSenseAd({
  slot = "auto",
  format = "auto",
  responsive = true,
  className = "",
  style,
}: AdSenseAdProps) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not yet loaded — will retry on next render
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`} style={style}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client="ca-pub-3923814665808842"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}

export function AdSenseInArticle() {
  return (
    <AdSenseAd
      slot="auto"
      format="fluid"
      className="my-8"
      style={{ minHeight: "100px" }}
    />
  );
}

export function AdSenseSidebar() {
  return (
    <AdSenseAd
      slot="auto"
      format="auto"
      className="sticky top-4"
      style={{ minHeight: "250px" }}
    />
  );
}

export function AdSenseFooter() {
  return (
    <AdSenseAd
      slot="auto"
      format="auto"
      className="my-4"
      style={{ minHeight: "90px" }}
    />
  );
}
