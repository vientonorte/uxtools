import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const NOINDEX_PREFIXES = ['/medicinal', '/selfradar', '/instafotos-app'];
const ROBOTS_ID = 'uxtools-route-robots';

function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Hash routes share one document. noindex is applied only while a listed
 * route is open, and removed on public routes.
 */
export function RoutePrivacy() {
  const { pathname } = useLocation();

  useEffect(() => {
    const existing = document.getElementById(ROBOTS_ID);
    if (!isNoindexPath(pathname)) {
      existing?.remove();
      return;
    }
    const meta = existing instanceof HTMLMetaElement
      ? existing
      : document.createElement('meta');
    meta.id = ROBOTS_ID;
    meta.name = 'robots';
    meta.content = 'noindex';
    if (!meta.parentNode) document.head.appendChild(meta);
  }, [pathname]);

  return null;
}
