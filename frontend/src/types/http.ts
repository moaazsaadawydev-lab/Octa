import type * as monaco from 'monaco-editor';
import { registerOctaMonacoThemes } from '../utils/monacoThemes';
import { parseSetCookie, getMatchingCookies, formatCookieHeader } from '../utils/httpCookieHelpers';
import { getDynamicAutoHeaderDefinitions, getComputedAutoHeaders } from '../utils/httpAutoHeaders';
import { safeDecodeUriComponent, parseQueryParamsFromUrl, buildUrlWithParams } from '../utils/httpUrlHelpers';

export {
  parseSetCookie,
  getMatchingCookies,
  formatCookieHeader,
  getDynamicAutoHeaderDefinitions,
  getComputedAutoHeaders,
  safeDecodeUriComponent,
  parseQueryParamsFromUrl,
  buildUrlWithParams,
};

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

export interface ComputedAutoHeader {
  key: string;
  value: string;
  description: string;
  isChecked: boolean;
  isEnabled: boolean;
  isOverridden: boolean;
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

// ============================================================================
// MONACO THEME DEFINITION
// ============================================================================

export const defineOctaTheme = (monacoInstance: typeof monaco) => {
  registerOctaMonacoThemes(monacoInstance);
};

// ============================================================================
// DEFAULT FACTORIES
// ============================================================================

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
