import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageMeta } from "./seo";

/** The one <meta>/<link> in <head> matching `selector`, created on demand. */
function headTag<T extends HTMLElement>(
  selector: string,
  create: () => T,
): T {
  let el = document.head.querySelector<T>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Keeps the document's title, description, robots and canonical in step
 * with the route. The build writes the same values into each page's
 * static HTML (src/lib/seo.ts), so a crawler that renders the app sees
 * them agree; this covers client-side navigation, where the HTML that
 * loaded belonged to a different page.
 */
export function usePageMeta(): void {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const meta = pageMeta(pathname);
    document.title = meta.title;
    headTag('meta[name="description"]', () => {
      const m = document.createElement("meta");
      m.name = "description";
      return m;
    }).content = meta.description;

    const robots = document.head.querySelector('meta[name="robots"]');
    if (meta.indexable) robots?.remove();
    else
      headTag('meta[name="robots"]', () => {
        const m = document.createElement("meta");
        m.name = "robots";
        return m;
      }).content = "noindex";

    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (!meta.canonical) canonical?.remove();
    else
      headTag<HTMLLinkElement>('link[rel="canonical"]', () => {
        const l = document.createElement("link");
        l.rel = "canonical";
        return l;
      }).href = meta.canonical;
  }, [pathname]);
}
