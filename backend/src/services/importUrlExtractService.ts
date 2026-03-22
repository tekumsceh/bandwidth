import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export type UrlImportExtraction = 'article' | 'full_page';

/**
 * Try to extract the **main article** (Mozilla Readability) — drops most nav, ads, sidebars.
 * Not perfect on every site; falls back to caller’s full-page strip when this returns null or too little text.
 */
export function extractReadableArticle(
  html: string,
  documentUrl: string,
): { text: string; articleTitle: string | null } | null {
  try {
    const dom = new JSDOM(html, { url: documentUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article?.textContent) return null;
    const raw = article.textContent.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (raw.length < 40) return null;
    return {
      text: raw,
      articleTitle: article.title?.trim() || null,
    };
  } catch {
    return null;
  }
}
