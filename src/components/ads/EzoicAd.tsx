import { useEffect, useRef, useId } from "react";

declare global {
  interface Window {
    ezstandalone?: {
      cmd: { push: (fn: () => void) => void } | any[];
      showAds: (opts?: Record<string, unknown>) => void;
      setOutstreamAllowed?: (v: boolean) => void;
      setInterstitialAllowed?: (v: boolean) => void;
      destroyPlaceholders?: (ids: string[]) => void;
      definePlaceholder?: (id: number, el: HTMLElement) => void;
    };
  }
}

let ezoicInitDone = false;
let placeholderCounter = 100;

function ensureEzoicInit() {
  if (typeof window === "undefined") return;
  if (ezoicInitDone) return;
  ezoicInitDone = true;
  window.ezstandalone = window.ezstandalone || {};
  window.ezstandalone.cmd = window.ezstandalone.cmd || [];
  try {
    (window.ezstandalone.cmd as any[]).push(function () {
      try {
        window.ezstandalone?.setOutstreamAllowed?.(false);
        window.ezstandalone?.setInterstitialAllowed?.(false);
      } catch {}
    });
  } catch {}
}

interface EzoicAdProps {
  placementId?: number;
  className?: string;
}

export function EzoicAd({ placementId, className = "" }: EzoicAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const placeholderId = useRef<string>(`ezoic-ph-${reactId.replace(/[^a-zA-Z0-9]/g, "")}-${placeholderCounter++}`);

  useEffect(() => {
    ensureEzoicInit();

    const tryShow = () => {
      try {
        if (typeof window === "undefined" || !window.ezstandalone) return;
        const cmd = window.ezstandalone.cmd;
        if (Array.isArray(cmd)) {
          (cmd as any[]).push(function () {
            try {
              window.ezstandalone?.showAds({});
            } catch {}
          });
        } else if (typeof (cmd as any)?.push === "function") {
          (cmd as any).push(function () {
            try {
              window.ezstandalone?.showAds({});
            } catch {}
          });
        }
      } catch {}
    };

    const timer = setTimeout(tryShow, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      id={placeholderId.current}
      className={`ezoic-ad-container ${className}`}
      style={{ minHeight: "90px", display: "block", width: "100%" }}
      aria-hidden="true"
    />
  );
}

export function ArticleEndAd() {
  return (
    <div className="container-read py-8 border-t rule">
      <EzoicAd placementId={103} className="article-end-ad" />
    </div>
  );
}

export function PageEndAd() {
  return (
    <div className="container-read py-8">
      <EzoicAd placementId={104} className="page-end-ad" />
    </div>
  );
}
