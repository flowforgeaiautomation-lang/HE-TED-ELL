import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { BookAnchorCard } from "@/components/BookAnchorCard";
import { MarketTicker } from "@/components/MarketTicker";
import { ReadingSettings } from "@/components/ReadingSettings";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useLiveTranslation } from "@/hooks/use-live-translation";
import { SafeComponent } from "@/components/SafeComponent";
import ErrorBoundary from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_LOGO, SITE_DESCRIPTION, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="container-read text-center">
        <div className="kicker">Error 404</div>
        <h1 className="display-1 mt-3">This page is missing from the edition.</h1>
        <p className="dek mt-4">
          The story you're looking for may have moved or been retired. Return to today's front page.
        </p>
        <Link
          to="/"
          search={{ category: undefined }}
          className="mt-8 inline-block border border-foreground px-5 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
        >
          Front page
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="container-read text-center">
        <h1 className="display-2 mt-3">Something went wrong</h1>
        <p className="dek mt-3">We couldn't load this page. Please try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { try { reset(); } catch {} }}
            className="border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="border border-foreground/40 px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
          >
            Front page
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${SITE_NAME} — ${SITE_TAGLINE}` },
      { name: "google-site-verification", content: "J7AZ3nQHhZDYiNmZs8E-WRFyL00uc8TiX59qq-XT_EY" },
      { name: "google-adsense-account", content: "ca-pub-3923814665808842" },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: SITE_NAME },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: `${SITE_NAME} — ${SITE_TAGLINE}` },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE_NAME} — ${SITE_TAGLINE}` },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: SITE_LOGO },
    ],
    scripts: [
      {
        src: "https://cmp.gatekeeperconsent.com/min.js",
        "data-cfasync": "false",
      },
      {
        src: "https://the.gatekeeperconsent.com/cmp.min.js",
        "data-cfasync": "false",
      },
      {
        src: "//www.ezojs.com/ezoic/sa.min.js",
        async: true,
      },
      {
        children: `window.ezstandalone=window.ezstandalone||{};ezstandalone.cmd=ezstandalone.cmd||[];`,
      },
      {
        src: "//ezoicanalytics.com/analytics.js",
      },
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-K7HBFF1Z2L",
        async: true,
      },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-K7HBFF1Z2L');`,
      },
      {
        children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];if(y&&y.parentNode){y.parentNode.insertBefore(t,y);}else if(l.head){l.head.appendChild(t);}else if(l.body){l.body.appendChild(t);}})(window, document, "clarity", "script", "xhl9zzzpkb");`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(websiteJsonLd()),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://images.pexels.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://images.pexels.com" },
      { rel: "dns-prefetch", href: "https://pagead2.googlesyndication.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const themeBootstrap = `(function(){try{var k="tuh-reading-prefs";var raw=localStorage.getItem(k);var t="system";if(raw){var p=JSON.parse(raw);if(p&&p.theme)t=p.theme;}var d=t==="dark"||t==="midnight"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var cls=["tuh-theme-light","tuh-theme-dark","tuh-theme-system","tuh-theme-sepia","tuh-theme-paper","tuh-theme-midnight","tuh-theme-high-contrast"];var m={"light":"tuh-theme-light","dark":"tuh-theme-dark","system":"tuh-theme-system","sepia":"tuh-theme-sepia","paper":"tuh-theme-paper","midnight":"tuh-theme-midnight","high-contrast":"tuh-theme-high-contrast"};var el=document.documentElement;cls.forEach(function(c){el.classList.remove(c);});if(m[t])el.classList.add(m[t]);el.classList.toggle("dark",d);var themes={"light":{"--background":"oklch(0.985 0.003 80)","--foreground":"oklch(0.16 0.005 270)","--paper":"oklch(0.985 0.003 80)","--ink":"oklch(0.16 0.005 270)","--rule":"oklch(0.16 0.005 270 / 0.18)","--card":"oklch(1 0 0)","--card-foreground":"oklch(0.16 0.005 270)","--popover":"oklch(1 0 0)","--popover-foreground":"oklch(0.16 0.005 270)","--primary":"oklch(0.16 0.005 270)","--primary-foreground":"oklch(0.985 0.003 80)","--secondary":"oklch(0.94 0.003 80)","--secondary-foreground":"oklch(0.16 0.005 270)","--muted":"oklch(0.95 0.003 80)","--muted-foreground":"oklch(0.42 0.005 270)","--accent":"oklch(0.92 0.003 80)","--accent-foreground":"oklch(0.16 0.005 270)","--destructive":"oklch(0.45 0.18 25)","--destructive-foreground":"oklch(0.985 0.003 80)","--border":"oklch(0.16 0.005 270 / 0.14)","--input":"oklch(0.16 0.005 270 / 0.18)","--ring":"oklch(0.16 0.005 270 / 0.4)"},"dark":{"--background":"oklch(0.18 0.01 250)","--foreground":"oklch(0.92 0.01 250)","--paper":"oklch(0.18 0.01 250)","--ink":"oklch(0.92 0.01 250)","--rule":"oklch(0.92 0.01 250 / 0.16)","--card":"oklch(0.22 0.01 250)","--card-foreground":"oklch(0.92 0.01 250)","--popover":"oklch(0.2 0.01 250)","--popover-foreground":"oklch(0.92 0.01 250)","--primary":"oklch(0.92 0.01 250)","--primary-foreground":"oklch(0.18 0.01 250)","--secondary":"oklch(0.26 0.01 250)","--secondary-foreground":"oklch(0.92 0.01 250)","--muted":"oklch(0.24 0.01 250)","--muted-foreground":"oklch(0.68 0.01 250)","--accent":"oklch(0.28 0.01 250)","--accent-foreground":"oklch(0.92 0.01 250)","--destructive":"oklch(0.58 0.18 25)","--destructive-foreground":"oklch(0.92 0.01 250)","--border":"oklch(0.92 0.01 250 / 0.14)","--input":"oklch(0.92 0.01 250 / 0.2)","--ring":"oklch(0.92 0.01 250 / 0.4)"},"sepia":{"--background":"oklch(0.95 0.02 75)","--foreground":"oklch(0.3 0.02 60)","--paper":"oklch(0.95 0.02 75)","--ink":"oklch(0.3 0.02 60)","--rule":"oklch(0.3 0.02 60 / 0.18)","--card":"oklch(0.93 0.02 75)","--card-foreground":"oklch(0.3 0.02 60)","--popover":"oklch(0.94 0.02 75)","--popover-foreground":"oklch(0.3 0.02 60)","--primary":"oklch(0.3 0.02 60)","--primary-foreground":"oklch(0.95 0.02 75)","--secondary":"oklch(0.88 0.02 75)","--secondary-foreground":"oklch(0.3 0.02 60)","--muted":"oklch(0.9 0.02 75)","--muted-foreground":"oklch(0.5 0.02 60)","--accent":"oklch(0.86 0.02 75)","--accent-foreground":"oklch(0.3 0.02 60)","--destructive":"oklch(0.45 0.18 25)","--destructive-foreground":"oklch(0.95 0.02 75)","--border":"oklch(0.3 0.02 60 / 0.14)","--input":"oklch(0.3 0.02 60 / 0.18)","--ring":"oklch(0.3 0.02 60 / 0.4)"},"paper":{"--background":"oklch(0.97 0.005 80)","--foreground":"oklch(0.2 0.01 270)","--paper":"oklch(0.97 0.005 80)","--ink":"oklch(0.2 0.01 270)","--rule":"oklch(0.2 0.01 270 / 0.16)","--card":"oklch(0.99 0 0)","--card-foreground":"oklch(0.2 0.01 270)","--popover":"oklch(0.99 0 0)","--popover-foreground":"oklch(0.2 0.01 270)","--primary":"oklch(0.2 0.01 270)","--primary-foreground":"oklch(0.97 0.005 80)","--secondary":"oklch(0.92 0.005 80)","--secondary-foreground":"oklch(0.2 0.01 270)","--muted":"oklch(0.94 0.005 80)","--muted-foreground":"oklch(0.45 0.01 270)","--accent":"oklch(0.9 0.005 80)","--accent-foreground":"oklch(0.2 0.01 270)","--destructive":"oklch(0.45 0.18 25)","--destructive-foreground":"oklch(0.97 0.005 80)","--border":"oklch(0.2 0.01 270 / 0.14)","--input":"oklch(0.2 0.01 270 / 0.18)","--ring":"oklch(0.2 0.01 270 / 0.4)"},"midnight":{"--background":"oklch(0.1 0.02 270)","--foreground":"oklch(0.85 0.02 250)","--paper":"oklch(0.1 0.02 270)","--ink":"oklch(0.85 0.02 250)","--rule":"oklch(0.85 0.02 250 / 0.14)","--card":"oklch(0.14 0.02 270)","--card-foreground":"oklch(0.85 0.02 250)","--popover":"oklch(0.12 0.02 270)","--popover-foreground":"oklch(0.85 0.02 250)","--primary":"oklch(0.85 0.02 250)","--primary-foreground":"oklch(0.1 0.02 270)","--secondary":"oklch(0.18 0.02 270)","--secondary-foreground":"oklch(0.85 0.02 250)","--muted":"oklch(0.16 0.02 270)","--muted-foreground":"oklch(0.6 0.02 250)","--accent":"oklch(0.2 0.02 270)","--accent-foreground":"oklch(0.85 0.02 250)","--destructive":"oklch(0.58 0.18 25)","--destructive-foreground":"oklch(0.85 0.02 250)","--border":"oklch(0.85 0.02 250 / 0.12)","--input":"oklch(0.85 0.02 250 / 0.16)","--ring":"oklch(0.85 0.02 250 / 0.4)"},"high-contrast":{"--background":"oklch(1 0 0)","--foreground":"oklch(0 0 0)","--paper":"oklch(1 0 0)","--ink":"oklch(0 0 0)","--rule":"oklch(0 0 0 / 0.5)","--card":"oklch(1 0 0)","--card-foreground":"oklch(0 0 0)","--popover":"oklch(1 0 0)","--popover-foreground":"oklch(0 0 0)","--primary":"oklch(0 0 0)","--primary-foreground":"oklch(1 0 0)","--secondary":"oklch(0.9 0 0)","--secondary-foreground":"oklch(0 0 0)","--muted":"oklch(0.95 0 0)","--muted-foreground":"oklch(0.2 0 0)","--accent":"oklch(0.88 0 0)","--accent-foreground":"oklch(0 0 0)","--destructive":"oklch(0.45 0.18 25)","--destructive-foreground":"oklch(1 0 0)","--border":"oklch(0 0 0 / 0.4)","--input":"oklch(0 0 0 / 0.4)","--ring":"oklch(0 0 0 / 0.6)"}};var tv=t==="system"?(d?themes.dark:themes.light):themes[t];if(tv){Object.keys(tv).forEach(function(key){el.style.setProperty(key,tv[key]);});}}catch(e){}})();`;
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `(function(){if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister();});if(regs.length>0){caches.keys().then(function(keys){keys.forEach(function(k){caches.delete(k);});});}});}})();` }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { translating } = useLiveTranslation();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  // Sync document.title on client-side navigation (head meta is SSR-only)
  useEffect(() => {
    const matches = router.state.matches;
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const route = match.route;
      if (route?.options?.head) {
        try {
          const head = route.options.head();
          if (head?.meta) {
            const titleMeta = head.meta.find((m: any) => m.title);
            if (titleMeta?.title) {
              document.title = titleMeta.title;
              break;
            }
          }
        } catch {}
      }
    }
  }, [router.state.location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <SafeComponent name="SiteHeader" fallback={null}>
          <SiteHeader />
        </SafeComponent>
        <SafeComponent name="BookAnchorCard" fallback={null}>
          <BookAnchorCard />
        </SafeComponent>
        <SafeComponent name="MarketTicker" fallback={null}>
          <MarketTicker />
        </SafeComponent>
        <main className="flex-1 page-enter">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        {translating && (
          <div className="fixed bottom-4 right-4 z-[100] bg-foreground text-background px-4 py-2 rounded-sm shadow-lg flex items-center gap-2 text-sm">
            <span className="inline-block h-3 w-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
            Translating…
          </div>
        )}
        <SafeComponent name="SiteFooter" fallback={null}>
          <SiteFooter />
        </SafeComponent>
        <SafeComponent name="ReadingSettings" fallback={null}>
          <ReadingSettings />
        </SafeComponent>
        <ScrollToTop />
      </div>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-foreground)",
            color: "var(--color-background)",
            border: "none",
            borderRadius: "2px",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
