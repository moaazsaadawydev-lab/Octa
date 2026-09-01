import type * as monaco from 'monaco-editor';

// ============================================================================
// HTTP TYPES & INTERFACES
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type HttpBodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded';

export interface HttpHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpParam {
  key: string;
  value: string;
  enabled: boolean;
}

export interface FormFileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File | Blob | any;
  fileObj?: File | Blob | any;
  filePath?: string;
  base64?: string;
}

export interface FormDataField {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
  file?: File | Blob | any;
  fileName?: string;
  filePath?: string;
  base64Data?: string;
  files?: FormFileMeta[];
}

export interface UrlEncodedField {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpRequestItem {
  id: string;
  type: 'request';
  name: string;
  method: HttpMethod;
  url: string;
  headers: HttpHeader[];
  params: HttpParam[];
  bodyType: HttpBodyType;
  bodyContent: string;
  bodyFormData?: FormDataField[];
  bodyUrlEncoded?: UrlEncodedField[];
  disabledAutoHeaders?: string[];
  isDirty?: boolean;
}

export interface HttpFolderItem {
  id: string;
  type: 'collection' | 'folder';
  name: string;
  isOpen?: boolean;
  items: (HttpFolderItem | HttpRequestItem)[];
}

export type HttpTreeItem = HttpFolderItem | HttpRequestItem;

export interface HttpResponseState {
  status: number;
  statusText: string;
  durationMs: number;
  sizeKb: number;
  data: any;
  headers: Record<string, string>;
}

export interface AutoHeaderDefinition {
  key: string;
  value: string | ((req: HttpRequestItem) => string);
  description: string;
}

export interface StoredCookie {
  domain: string;
  path: string;
  name: string;
  value: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_JSON_BODY = '{\n  "key": "value"\n}';

export const HTTP_METHODS: { method: HttpMethod; label: string; color: string; badge: string }[] = [
  { method: 'GET', label: 'GET', color: 'text-emerald-400', badge: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' },
  { method: 'POST', label: 'POST', color: 'text-amber-400', badge: 'bg-amber-950/70 border-amber-500/40 text-amber-300' },
  { method: 'PUT', label: 'PUT', color: 'text-blue-400', badge: 'bg-blue-950/70 border-blue-500/40 text-blue-300' },
  { method: 'PATCH', label: 'PATCH', color: 'text-purple-400', badge: 'bg-purple-950/70 border-purple-500/40 text-purple-300' },
  { method: 'DELETE', label: 'DELETE', color: 'text-rose-400', badge: 'bg-rose-950/70 border-rose-500/40 text-rose-300' },
  { method: 'OPTIONS', label: 'OPTIONS', color: 'text-zinc-400', badge: 'bg-zinc-900 border-zinc-700 text-zinc-300' },
  { method: 'HEAD', label: 'HEAD', color: 'text-sky-400', badge: 'bg-sky-950/70 border-sky-500/40 text-sky-300' },
];

export const METHOD_COLORS: Record<string, { badge: string; text: string }> = HTTP_METHODS.reduce((acc, curr) => {
  acc[curr.method] = { badge: curr.badge, text: curr.color };
  return acc;
}, {} as Record<string, { badge: string; text: string }>);

import { registerOctaMonacoThemes } from '../utils/monacoThemes';

// ============================================================================
// MONACO THEME DEFINITION
// ============================================================================

export const defineOctaTheme = (monacoInstance: typeof monaco) => {
  registerOctaMonacoThemes(monacoInstance);
};

// ============================================================================
// COOKIE & HEADER HELPERS
// ============================================================================

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

export function getComputedAutoHeaders(req: HttpRequestItem | null, cookieJar: StoredCookie[] = []) {
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

// ============================================================================
// URL & QUERY PARAMETERS HELPERS
// ============================================================================

export function safeDecodeUriComponent(str: string): string {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch {
    return str;
  }
}

export function parseQueryParamsFromUrl(rawUrl: string, existingParams: HttpParam[] = []): HttpParam[] {
  const qIndex = rawUrl.indexOf('?');
  const existingDisabled = existingParams.filter((p) => !p.enabled);

  if (qIndex === -1) {
    return [...existingDisabled];
  }

  const queryString = rawUrl.slice(qIndex + 1);
  if (!queryString) {
    return [...existingDisabled];
  }

  const pairs = queryString.split('&');
  const parsedParams: HttpParam[] = [];

  for (const pair of pairs) {
    if (!pair && pair !== '') continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      parsedParams.push({
        key: safeDecodeUriComponent(pair),
        value: '',
        enabled: true,
      });
    } else {
      const key = safeDecodeUriComponent(pair.slice(0, eqIdx));
      const value = safeDecodeUriComponent(pair.slice(eqIdx + 1));
      parsedParams.push({
        key,
        value,
        enabled: true,
      });
    }
  }

  return [...parsedParams, ...existingDisabled];
}

export function buildUrlWithParams(currentUrl: string, params: HttpParam[]): string {
  const qIndex = currentUrl.indexOf('?');
  const basePath = qIndex !== -1 ? currentUrl.slice(0, qIndex) : currentUrl;

  const activeParams = params.filter((p) => p.enabled && (p.key.trim() !== '' || p.value.trim() !== ''));
  if (activeParams.length === 0) {
    return basePath;
  }

  const queryParts = activeParams.map((p) => {
    const k = p.key;
    const v = p.value;
    if (v !== '') {
      return `${k}=${v}`;
    }
    return k;
  });

  return `${basePath}?${queryParts.join('&')}`;
}

export const createDefaultRequest = (name: string = 'Untitled Request'): HttpRequestItem => ({
  id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'request',
  name,
  method: 'GET',
  url: '',
  headers: [],
  params: [],
  bodyType: 'none',
  bodyContent: DEFAULT_JSON_BODY,
  bodyFormData: [],
  bodyUrlEncoded: [],
  disabledAutoHeaders: [],
  isDirty: false,
});

export const createDefaultFolder = (name: string = 'New Folder'): HttpFolderItem => ({
  id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'folder',
  name,
  isOpen: true,
  items: [],
});

export const createDefaultCollection = (name: string = 'Untitled Collection'): HttpFolderItem => ({
  id: 'col-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'collection',
  name,
  isOpen: true,
  items: [],
});
