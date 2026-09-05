import { StoredCookie } from '../types/http';

export function parseSetCookie(headerValue: string, targetUrl: string): StoredCookie | null {
  try {
    let parsedUrl: URL;
    try {
      let u = targetUrl.trim();
      if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
      parsedUrl = new URL(u);
    } catch {
      return null;
    }

    const parts = headerValue.split(';').map((p) => p.trim());
    if (parts.length === 0 || !parts[0].includes('=')) return null;

    const [firstPart, ...directives] = parts;
    const eqIdx = firstPart.indexOf('=');
    const name = firstPart.substring(0, eqIdx).trim();
    const value = firstPart.substring(eqIdx + 1).trim();
    if (!name) return null;

    let domain = parsedUrl.hostname;
    let path = '/';
    let expires: number | undefined = undefined;
    let httpOnly = false;
    let secure = false;

    for (const dir of directives) {
      const lower = dir.toLowerCase();
      if (lower.startsWith('domain=')) {
        let d = dir.substring(7).trim();
        if (d.startsWith('.')) d = d.substring(1);
        if (d) domain = d;
      } else if (lower.startsWith('path=')) {
        path = dir.substring(5).trim() || '/';
      } else if (lower.startsWith('expires=')) {
        const expDate = new Date(dir.substring(8).trim());
        if (!isNaN(expDate.getTime())) {
          expires = expDate.getTime();
        }
      } else if (lower.startsWith('max-age=')) {
        const secs = parseInt(dir.substring(8).trim(), 10);
        if (!isNaN(secs)) {
          expires = Date.now() + secs * 1000;
        }
      } else if (lower === 'httponly') {
        httpOnly = true;
      } else if (lower === 'secure') {
        secure = true;
      }
    }

    return {
      name,
      value,
      domain,
      path,
      expires,
      httpOnly,
      secure,
    };
  } catch {
    return null;
  }
}

export function getMatchingCookies(cookies: StoredCookie[], targetUrl: string): StoredCookie[] {
  try {
    if (!targetUrl || !targetUrl.trim()) return [];
    let u = targetUrl.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname || '/';
    const now = Date.now();

    return cookies.filter((c) => {
      if (c.expires && c.expires < now) return false;
      const cookieDomain = c.domain.toLowerCase().replace(/^\./, '');
      const domainMatch = host === cookieDomain || host.endsWith('.' + cookieDomain);
      if (!domainMatch) return false;
      const cookiePath = c.path || '/';
      const pathMatch = path.startsWith(cookiePath) || cookiePath === '/';
      if (!pathMatch) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export function formatCookieHeader(cookies: StoredCookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}
