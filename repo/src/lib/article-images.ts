import { categoryLabel } from "./categories";
import type { ArticleSummary } from "./types";

export function fallbackCoverUrl(article: Pick<ArticleSummary, "title" | "category" | "slug">) {
  const label = categoryLabel(article.category);
  const title = article.title.slice(0, 90);
  const seed = Array.from(`${article.slug}-${article.category}`).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const accent = ["#8A2D2D", "#25635A", "#6E5B18", "#2F5E88", "#5B4E7A"][seed % 5];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${escapeSvg(title)}"><rect width="1600" height="1000" fill="#f6f1e7"/><rect x="72" y="72" width="1456" height="856" fill="#fbf8f0" stroke="#1f1b16" stroke-width="6"/><rect x="118" y="126" width="1364" height="72" fill="${accent}"/><text x="128" y="172" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#fbf8f0" letter-spacing="4">${escapeSvg(label.toUpperCase())}</text><line x1="128" y1="292" x2="1472" y2="292" stroke="#1f1b16" stroke-width="4"/><line x1="128" y1="706" x2="1472" y2="706" stroke="#1f1b16" stroke-width="4"/><text x="128" y="402" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#1f1b16">${escapeSvg(title.slice(0, 32))}</text><text x="128" y="500" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#1f1b16">${escapeSvg(title.slice(32, 64))}</text><text x="128" y="598" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#1f1b16">${escapeSvg(title.slice(64, 90))}</text><text x="128" y="812" font-family="Arial, sans-serif" font-size="28" fill="#4f4a42" letter-spacing="5">THE UNITED HELL</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}