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
import { supabase } from "@/integrations/supabase/client";
// Translation is handled by the user's browser (Chrome/Edge "Translate page" in the ⋮ menu).

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
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="container-read text-center">
        <div className="kicker">Press error</div>
        <h1 className="display-2 mt-3">The presses jammed.</h1>
        <p className="dek mt-3">Try again, or return to the front page.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
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
      { title: "The United Hell — Beyond comfort. Beyond headlines." },
     { name: "google-site-verification", content: "J7AZ3nQHhZDYiNmZs8E-WRFyL00uc8TiX59qq-XT_EY" }, 
      {
        name: "description",
        content:
          "An AI-curated journal of discovery: science, history, wildlife, technology, and the people quietly shaping the world.",
      },
      { name: "author", content: "The United Hell" },
      { property: "og:title", content: "The United Hell — Beyond comfort. Beyond headlines." },
      {
        property: "og:description",
        content: "An AI-curated journal of discovery, knowledge, and exploration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "The United Hell — Beyond comfort. Beyond headlines." },
      { name: "description", content: "Global Insight Hub delivers continuously updated, journalist-quality news and discovery articles." },
      { property: "og:description", content: "Global Insight Hub delivers continuously updated, journalist-quality news and discovery articles." },
      { name: "twitter:description", content: "Global Insight Hub delivers continuously updated, journalist-quality news and discovery articles." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/26064541-ea86-4f86-8c33-e06d2af5defd/id-preview-7b8da711--8976fc18-b87e-4c0b-b991-9aea76df5b96.lovable.app-1782369186247.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/26064541-ea86-4f86-8c33-e06d2af5defd/id-preview-7b8da711--8976fc18-b87e-4c0b-b991-9aea76df5b96.lovable.app-1782369186247.png" },
    ],
    scripts: [
      {
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3923814665808842",
        async: true,
        crossOrigin: "anonymous",
      },
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-K7HBFF1Z2L",
        async: true,
      },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-K7HBFF1Z2L');`,
      },
      {
        children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "xhl9zzzpkb");`,
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
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
  return (
    <html lang="en">
      <head>
        <HeadContent />
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
  

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
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
