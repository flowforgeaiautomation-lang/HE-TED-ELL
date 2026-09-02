export const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.theunitedhell.in").replace(/\/$/, "");

export const SITE_NAME = "The United Hell";
export const SITE_TAGLINE = "Beyond comfort. Beyond headlines.";
export const SITE_LOGO = `${SITE_URL}/THEUH.LOGO.png`;
export const SITE_DESCRIPTION =
  "The United Hell brings together the world's most important stories, discoveries, civilizations, innovations, and ideas — transforming information into understanding, curiosity into exploration, and knowledge into progress.";

export function canonicalUrl(path: string): string {
  let clean = path.startsWith("/") ? path : `/${path}`;
  // Strip query string and hash — canonical URLs must be parameter-free
  clean = clean.split("?")[0].split("#")[0];
  // Collapse duplicate slashes and remove trailing slash (except root)
  clean = clean.replace(/\/+/g, "/");
  if (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1);
  return `${SITE_URL}${clean}`;
}

export function articleUrl(slug: string): string {
  return canonicalUrl(`/article/${slug}`);
}

type JsonLdOrg = Record<string, unknown>;

export function organizationJsonLd(): JsonLdOrg {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "NewsMediaOrganization"],
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: SITE_LOGO,
      width: 512,
      height: 512,
    },
    description: SITE_DESCRIPTION,
    sameAs: [],
  };
}

export function websiteJsonLd(): JsonLdOrg {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function newsArticleJsonLd(article: {
  title: string;
  dek?: string | null;
  slug: string;
  cover_image_url?: string | null;
  published_at: string;
  category: string;
  author?: string;
}): JsonLdOrg {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.dek || article.title,
    url: articleUrl(article.slug),
    image: {
      "@type": "ImageObject",
      url: article.cover_image_url || SITE_LOGO,
    },
    datePublished: article.published_at,
    dateModified: article.published_at,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: SITE_LOGO,
      },
    },
    articleSection: article.category,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl(article.slug),
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): JsonLdOrg {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
