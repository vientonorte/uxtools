import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const NOINDEX_PREFIXES = ['/medicinal', '/selfradar', '/instafotos-app'];
const ROBOTS_ID = 'uxtools-route-robots';

export function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Sets or removes the route robots meta. Public routes stay indexable. */
export function syncRouteRobots(pathname: string, doc: Document = document): void {
  const existing = doc.getElementById(ROBOTS_ID);
  if (!isNoindexPath(pathname)) {
    existing?.remove();
    return;
  }
  const meta = (existing ?? doc.createElement('meta')) as HTMLMetaElement;
  meta.id = ROBOTS_ID;
  meta.name = 'robots';
  meta.content = 'noindex';
  if (!meta.parentNode) doc.head.appendChild(meta);
}

/**
 * Hash routes share one document. noindex is applied only while a listed
 * route is open, and removed on public routes.
 */
export function RoutePrivacy() {
  const { pathname } = useLocation();

  useEffect(() => {
    syncRouteRobots(pathname);
  }, [pathname]);

  return null;
}
