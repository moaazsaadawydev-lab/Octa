import {
  SaveHttpClientData,
  LoadHttpClientData,
  SaveSqlQueriesData,
  LoadSqlQueriesData,
  ExecuteHttpRequest,
} from '../../wailsjs/go/main/App';

export interface FormFieldPayload {
  key: string;
  value: string;
  type: 'text' | 'file';
  fileName?: string;
  filePath?: string;
  base64Data?: string;
  contentType?: string;
  fileNames?: string[];
  filePaths?: string[];
  fileBase64?: string[];
}

export interface HttpRequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyType: string;
  bodyContent?: string;
  formData?: FormFieldPayload[];
  urlEncoded?: Record<string, string>;
  timeoutSec?: number;
}

export interface HttpResponsePayload {
  status: number;
  statusText: string;
  durationMs: number;
  sizeKb: number;
  data: any;
  headers: Record<string, string>;
  cookies?: string[];
  error?: string;
}

export async function saveHttpClientData(jsonData: string): Promise<void> {
  try {
    if (typeof SaveHttpClientData === 'function') {
      await SaveHttpClientData(jsonData);
    }
  } catch (err: any) {
    console.error('Failed to save HTTP client data via backend:', err);
    throw err;
  }
}

export async function loadHttpClientData(): Promise<string> {
  try {
    if (typeof LoadHttpClientData === 'function') {
      return await LoadHttpClientData();
    }
  } catch (err: any) {
    console.error('Failed to load HTTP client data via backend:', err);
  }
  return '';
}

export async function saveSqlQueriesData(jsonData: string): Promise<void> {
  try {
    if (typeof SaveSqlQueriesData === 'function') {
      await SaveSqlQueriesData(jsonData);
    }
  } catch (err: any) {
    console.error('Failed to save SQL queries data via backend:', err);
    throw err;
  }
}

export async function loadSqlQueriesData(): Promise<string> {
  try {
    if (typeof LoadSqlQueriesData === 'function') {
      return await LoadSqlQueriesData();
    }
  } catch (err: any) {
    console.error('Failed to load SQL queries data via backend:', err);
  }
  return '';
}

export async function executeHttpRequest(
  payload: HttpRequestPayload
): Promise<HttpResponsePayload> {
  try {
    if (typeof ExecuteHttpRequest === 'function') {
      const res = await ExecuteHttpRequest(payload as any);
      return {
        status: res.status,
        statusText: res.statusText || '',
        durationMs: res.durationMs || 0,
        sizeKb: Number(res.sizeKb ? res.sizeKb.toFixed(2) : 0),
        data: res.data,
        headers: res.headers || {},
        cookies: res.cookies || [],
        error: res.error || '',
      };
    }
  } catch (err: any) {
    console.warn('Backend ExecuteHttpRequest failed:', err);
    throw err;
  }
  throw new Error('Native Go HTTP client is only available in Octa desktop runtime');
}

export async function selectFilesDialog(): Promise<
  Array<{ name: string; filePath: string; size: number }>
> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.SelectFilesDialog === 'function'
    ) {
      const res = await w.go.main.App.SelectFilesDialog();
      return res || [];
    }
  } catch (e) {
    console.warn('SelectFilesDialog binding not available, using fallback', e);
  }
  return [];
}

export async function saveEnvironmentsData(jsonData: string): Promise<void> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.SaveEnvironmentsData === 'function'
    ) {
      await w.go.main.App.SaveEnvironmentsData(jsonData);
      return;
    }
  } catch (e) {
    console.warn('SaveEnvironmentsData binding error:', e);
  }
}

export async function loadEnvironmentsData(): Promise<string> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.LoadEnvironmentsData === 'function'
    ) {
      const res = await w.go.main.App.LoadEnvironmentsData();
      return res || '[]';
    }
  } catch (e) {
    console.warn('LoadEnvironmentsData binding error:', e);
  }
  return '[]';
}
