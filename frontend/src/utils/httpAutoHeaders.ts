import { HttpRequestItem, AutoHeaderDefinition, ComputedAutoHeader, StoredCookie } from '../types/http';
import { getMatchingCookies, formatCookieHeader } from './httpCookieHelpers';

export function getDynamicAutoHeaderDefinitions(
  req: HttpRequestItem,
  cookieJar: StoredCookie[] = []
): AutoHeaderDefinition[] {
  const list: AutoHeaderDefinition[] = [
    {
      key: 'Host',
      value: (r: HttpRequestItem) => {
        try {
          if (!r.url) return '<calculated when request is sent>';
          let u = r.url.trim();
          if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
          const parsed = new URL(u);
          return parsed.host || '<calculated when request is sent>';
        } catch {
          return '<calculated when request is sent>';
        }
      },
      description: 'Target server host',
    },
    { key: 'User-Agent', value: 'OctaRuntime/1.0', description: 'Octa HTTP client identifier' },
    { key: 'Accept', value: '*/*', description: 'Supported response MIME types' },
    { key: 'Accept-Encoding', value: 'gzip, deflate, br', description: 'Supported response compression algorithms' },
    { key: 'Connection', value: 'keep-alive', description: 'Persistent connection keep-alive' },
    { key: 'Cache-Control', value: 'no-cache', description: 'Bypass intermediary caching' },
    {
      key: 'Octa-Token',
      value: (r: HttpRequestItem) => {
        return 'octa_' + (r.id.startsWith('req-') ? r.id.substring(4) : r.id);
      },
      description: 'Octa request tracking identifier',
    },
  ];

  if (req.bodyType === 'json') {
    list.push({
      key: 'Content-Type',
      value: 'application/json',
      description: 'JSON payload format',
    });
  } else if (req.bodyType === 'form-data') {
    list.push({
      key: 'Content-Type',
      value: 'multipart/form-data; boundary=<calculated when request is sent>',
      description: 'Multipart form-data boundary',
    });
  } else if (req.bodyType === 'x-www-form-urlencoded') {
    list.push({
      key: 'Content-Type',
      value: 'application/x-www-form-urlencoded',
      description: 'URL-encoded form payload',
    });
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    list.push({
      key: 'Content-Length',
      value: (r: HttpRequestItem) => {
        if (r.bodyType === 'json' && r.bodyContent) {
          try {
            return String(new TextEncoder().encode(r.bodyContent).length);
          } catch {
            return String(r.bodyContent.length);
          }
        }
        if (r.bodyType === 'x-www-form-urlencoded' && r.bodyUrlEncoded && r.bodyUrlEncoded.length > 0) {
          const params = new URLSearchParams();
          for (const row of r.bodyUrlEncoded) {
            if (row.enabled && row.key.trim()) {
              params.append(row.key, row.value || '');
            }
          }
          const str = params.toString();
          return String(new TextEncoder().encode(str).length);
        }
        if (r.bodyType === 'form-data') {
          return '<calculated when request is sent>';
        }
        if (r.bodyType === 'none') {
          return '0';
        }
        return '<calculated when request is sent>';
      },
      description: 'Payload byte length',
    });
  }

  const matching = getMatchingCookies(cookieJar, req.url);
  if (matching.length > 0) {
    list.push({
      key: 'Cookie',
      value: formatCookieHeader(matching),
      description: 'Active session cookies for target host',
    });
  }

  return list;
}

export function getComputedAutoHeaders(
  req: HttpRequestItem | null,
  cookieJar: StoredCookie[] = []
): ComputedAutoHeader[] {
  if (!req) return [];
  const defs = getDynamicAutoHeaderDefinitions(req, cookieJar);
  const disabledList = (req.disabledAutoHeaders || []).map((k) => k.toLowerCase());
  const customKeys = new Set(
    req.headers.filter((h) => h.enabled && h.key.trim()).map((h) => h.key.trim().toLowerCase())
  );

  return defs.map((def) => {
    const keyLower = def.key.toLowerCase();
    const val = typeof def.value === 'function' ? def.value(req) : def.value;
    const isOverridden = customKeys.has(keyLower);
    const isChecked = !disabledList.includes(keyLower);
    const isEnabled = isChecked && !isOverridden;

    return {
      key: def.key,
      value: val,
      description: def.description,
      isChecked,
      isEnabled,
      isOverridden,
    };
  });
}
