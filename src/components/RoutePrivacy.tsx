import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { legacyText } from '../lib/legacy-text';

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
 * Legacy instafotos path is rebuilt at runtime so the old bookmark still opens.
 */
export function RoutePrivacy() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const legacy = legacyText([47, 99, 97, 109, 105, 108, 97]);
    if (pathname === legacy || pathname.startsWith(`${legacy}/`)) {
      const rest = pathname.slice(legacy.length);
      navigate(`/instafotos-app${rest}`, { replace: true });
    }
  }, [pathname, navigate]);

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
