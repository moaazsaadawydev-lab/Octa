import {
  HttpFolderItem,
  HttpRequestItem,
  HttpHeader,
  HttpParam,
  HttpBodyType,
  FormDataField,
  UrlEncodedField,
  safeDecodeUriComponent,
  parseQueryParamsFromUrl,
} from '../types/http';
import { EnvironmentVariable } from '../types/environments';

export interface PostmanImportResult {
  collection: HttpFolderItem;
  variables: EnvironmentVariable[];
  totalRequests: number;
  totalFolders: number;
}

let idCounter = 0;
const generateUniqueId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Maps a Postman collection JSON (v2.0 or v2.1) into Octa's internal collection model
 */
export function mapPostmanCollection(json: any): PostmanImportResult {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid JSON: Root must be an object');
  }

  const collectionName = json.info?.name || 'Imported Postman Collection';
  let totalRequests = 0;
  let totalFolders = 0;

  // 1. Extract collection-level variables
  const variables: EnvironmentVariable[] = [];
  if (Array.isArray(json.variable)) {
    for (const v of json.variable) {
      if (v && typeof v === 'object' && v.key) {
        variables.push({
          id: generateUniqueId('var'),
          key: String(v.key).trim(),
          value: v.value !== undefined && v.value !== null ? String(v.value) : '',
          enabled: v.disabled !== true,
          type: v.secret || v.type === 'secret' ? 'secret' : 'default',
        });
      }
    }
  }

  // 2. Recursive items mapper
  const mapItem = (item: any): HttpFolderItem | HttpRequestItem | null => {
    if (!item || typeof item !== 'object') return null;

    const name = item.name || 'Untitled';

    // A. Folder node
    if (Array.isArray(item.item) && !item.request) {
      totalFolders += 1;
      const folderItems: (HttpFolderItem | HttpRequestItem)[] = [];
      for (const child of item.item) {
        const mappedChild = mapItem(child);
        if (mappedChild) {
          folderItems.push(mappedChild);
        }
      }
      const folder: HttpFolderItem = {
        id: generateUniqueId('folder'),
        type: 'folder',
        name,
        isOpen: true,
        items: folderItems,
      };
      return folder;
    }

    // B. HTTP Request node
    if (item.request) {
      totalRequests += 1;
      const req = item.request;

      // Method
      const rawMethod = typeof req === 'string' ? 'GET' : (req.method || 'GET').toUpperCase();
      const method = (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(rawMethod)
        ? rawMethod
        : 'GET') as any;

      // URL
      let rawUrl = '';
      let parsedParams: HttpParam[] = [];

      if (typeof req.url === 'string') {
        rawUrl = req.url.trim();
      } else if (req.url && typeof req.url === 'object') {
        if (req.url.raw && typeof req.url.raw === 'string') {
          rawUrl = req.url.raw.trim();
        } else {
          // Reconstruct URL from parts
          const protocol = req.url.protocol ? `${req.url.protocol}://` : '';
          const host = Array.isArray(req.url.host) ? req.url.host.join('.') : (req.url.host || '');
          const port = req.url.port ? `:${req.url.port}` : '';
          const path = Array.isArray(req.url.path) ? req.url.path.join('/') : (req.url.path || '');
          rawUrl = `${protocol}${host}${port}${path ? `/${path}` : ''}`;
        }

        // Query parameters
        if (Array.isArray(req.url.query)) {
          for (const q of req.url.query) {
            if (q && typeof q === 'object' && q.key !== undefined) {
              parsedParams.push({
                key: String(q.key || ''),
                value: q.value !== undefined && q.value !== null ? String(q.value) : '',
                enabled: q.disabled !== true,
              });
            }
          }
        }
      }

      // If no explicit query params found in object, parse query string from URL
      if (parsedParams.length === 0 && rawUrl.includes('?')) {
        parsedParams = parseQueryParamsFromUrl(rawUrl, []);
      }

      // Headers
      const headers: HttpHeader[] = [];
      if (Array.isArray(req.header)) {
        for (const h of req.header) {
          if (h && typeof h === 'object' && h.key) {
            headers.push({
              key: String(h.key).trim(),
              value: h.value !== undefined && h.value !== null ? String(h.value) : '',
              enabled: h.disabled !== true,
            });
          }
        }
      }

      // Auth Header Injection (if Postman auth is present and not already in headers)
      if (req.auth && typeof req.auth === 'object') {
        const hasAuthHeader = headers.some((h) => h.key.toLowerCase() === 'authorization');
        if (!hasAuthHeader) {
          if (req.auth.type === 'bearer' && Array.isArray(req.auth.bearer)) {
            const tokenEntry = req.auth.bearer.find((b: any) => b.key === 'token');
            if (tokenEntry?.value) {
              headers.push({
                key: 'Authorization',
                value: `Bearer ${tokenEntry.value}`,
                enabled: true,
              });
            }
          } else if (req.auth.type === 'jwt' && Array.isArray(req.auth.jwt)) {
            // JWT Auth
            const tokenEntry = req.auth.jwt.find((j: any) => j.key === 'token' || j.key === 'secret');
            if (tokenEntry?.value) {
              headers.push({
                key: 'Authorization',
                value: `Bearer ${tokenEntry.value}`,
                enabled: true,
              });
            }
          }
        }
      }

      // Body
      let bodyType: HttpBodyType = 'none';
      let bodyContent = '';
      const bodyFormData: FormDataField[] = [];
      const bodyUrlEncoded: UrlEncodedField[] = [];

      if (req.body && typeof req.body === 'object') {
        const mode = req.body.mode;

        if (mode === 'raw') {
          bodyType = 'json';
          bodyContent = typeof req.body.raw === 'string' ? req.body.raw : '';
        } else if (mode === 'formdata') {
          bodyType = 'form-data';
          if (Array.isArray(req.body.formdata)) {
            for (const f of req.body.formdata) {
              if (f && typeof f === 'object' && f.key) {
                const isFile = f.type === 'file';
                bodyFormData.push({
                  id: generateUniqueId('fd'),
                  key: String(f.key),
                  value: !isFile && f.value !== undefined ? String(f.value) : '',
                  type: isFile ? 'file' : 'text',
                  enabled: f.disabled !== true,
                  fileName: isFile && typeof f.src === 'string' ? f.src : undefined,
                });
              }
            }
          }
        } else if (mode === 'urlencoded') {
          bodyType = 'x-www-form-urlencoded';
          if (Array.isArray(req.body.urlencoded)) {
            for (const u of req.body.urlencoded) {
              if (u && typeof u === 'object' && u.key) {
                bodyUrlEncoded.push({
                  id: generateUniqueId('ue'),
                  key: String(u.key),
                  value: u.value !== undefined ? String(u.value) : '',
                  enabled: u.disabled !== true,
                });
              }
            }
          }
        }
      }

      const requestItem: HttpRequestItem = {
        id: generateUniqueId('req'),
        type: 'request',
        name,
        method,
        url: rawUrl,
        headers,
        params: parsedParams,
        bodyType,
        bodyContent,
        bodyFormData,
        bodyUrlEncoded,
        disabledAutoHeaders: [],
        isDirty: false,
      };

      return requestItem;
    }

    return null;
  };

  // 3. Map root items
  const rootItems: (HttpFolderItem | HttpRequestItem)[] = [];
  if (Array.isArray(json.item)) {
    for (const topItem of json.item) {
      const mapped = mapItem(topItem);
      if (mapped) {
        rootItems.push(mapped);
      }
    }
  }

  const rootCollection: HttpFolderItem = {
    id: generateUniqueId('col'),
    type: 'collection',
    name: collectionName,
    isOpen: true,
    items: rootItems,
  };

  return {
    collection: rootCollection,
    variables,
    totalRequests,
    totalFolders,
  };
}
