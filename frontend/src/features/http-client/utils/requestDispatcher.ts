import {
  HttpRequestItem,
  StoredCookie,
  HttpResponseState,
  Environment,
  EnvironmentVariable,
  HttpResponsePayload,
  getComputedAutoHeaders,
  parseSetCookie,
} from '../types';
import { executeHttpRequest } from '../../../services/api';
import { resolveTemplate } from '../../../utils/templateResolver';
import { serializeFormDataRows, fileToBase64 } from './formDataSerializer';

export { fileToBase64 };

export interface DispatchRequestOptions {
  activeRequest: HttpRequestItem;
  activeEnvironment: Environment | null;
  globalVariables: EnvironmentVariable[];
  cookieJar: StoredCookie[];
  liveFileObjects?: Map<string, File>;
}

export interface DispatchResult {
  result: HttpResponseState;
  newCookies: StoredCookie[];
}

export async function dispatchHttpRequest({
  activeRequest,
  activeEnvironment,
  globalVariables,
  cookieJar,
  liveFileObjects,
}: DispatchRequestOptions): Promise<DispatchResult> {
  const startTs = Date.now();
  let targetUrl = resolveTemplate(activeRequest.url.trim(), activeEnvironment, globalVariables).trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const queryParamsObj: Record<string, string> = {};
  activeRequest.params.filter((p) => p.enabled && p.key).forEach((p) => {
    queryParamsObj[p.key.trim()] = p.value;
  });

  const reqHeaders: Record<string, string> = {};
  const computedAuto = getComputedAutoHeaders(activeRequest, cookieJar);
  for (const ah of computedAuto) {
    if (ah.isEnabled && ah.value && !ah.value.startsWith('<')) reqHeaders[ah.key] = ah.value;
  }

  activeRequest.headers.forEach((h) => {
    if (h.enabled && h.key.trim()) {
      const k = resolveTemplate(h.key.trim(), activeEnvironment, globalVariables);
      const v = resolveTemplate(h.value, activeEnvironment, globalVariables);
      if (k) reqHeaders[k] = v;
    }
  });

  let formDataPayload: any[] = [];
  const urlEncodedPayload: Record<string, string> = {};

  if (activeRequest.method !== 'GET' && activeRequest.method !== 'HEAD') {
    if (activeRequest.bodyType === 'form-data') {
      formDataPayload = await serializeFormDataRows(activeRequest.bodyFormData || [], liveFileObjects);
    } else if (activeRequest.bodyType === 'x-www-form-urlencoded') {
      (activeRequest.bodyUrlEncoded || []).forEach((r) => {
        if (r.enabled && r.key.trim()) urlEncodedPayload[r.key.trim()] = r.value || '';
      });
    }
  }

  let res: HttpResponsePayload;
  try {
    res = await executeHttpRequest({
      method: activeRequest.method,
      url: targetUrl,
      headers: reqHeaders,
      queryParams: queryParamsObj,
      bodyType: activeRequest.bodyType,
      bodyContent: resolveTemplate(activeRequest.bodyContent || '', activeEnvironment, globalVariables),
      formData: formDataPayload.map((f) => ({
        ...f,
        key: resolveTemplate(f.key, activeEnvironment, globalVariables),
        value: resolveTemplate(f.value, activeEnvironment, globalVariables),
      })),
      urlEncoded: Object.entries(urlEncodedPayload).reduce((acc, [k, v]) => {
        acc[resolveTemplate(k, activeEnvironment, globalVariables)] = resolveTemplate(v, activeEnvironment, globalVariables);
        return acc;
      }, {} as Record<string, string>),
    });
  } catch {
    const options: RequestInit = { method: activeRequest.method, headers: reqHeaders };
    let finalUrl = targetUrl;
    const enabledParams = activeRequest.params.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + enabledParams.map((p) => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value)).join('&');
    }
    if (activeRequest.method !== 'GET' && activeRequest.method !== 'HEAD') {
      if (activeRequest.bodyType === 'json') options.body = activeRequest.bodyContent;
      else if (activeRequest.bodyType === 'x-www-form-urlencoded') options.body = new URLSearchParams(urlEncodedPayload).toString();
    }
    const fetchRes = await fetch(finalUrl, options);
    const text = await fetchRes.text();
    let jsonData: any = null;
    try { jsonData = JSON.parse(text); } catch { jsonData = text; }
    const resHeaders: Record<string, string> = {};
    const setCookiesReceived: string[] = [];
    fetchRes.headers.forEach((v, k) => {
      resHeaders[k] = v;
      if (k.toLowerCase() === 'set-cookie') setCookiesReceived.push(v);
    });
    res = {
      status: fetchRes.status,
      statusText: fetchRes.statusText || (fetchRes.ok ? 'OK' : 'Error'),
      durationMs: Date.now() - startTs,
      sizeKb: Number((text.length / 1024).toFixed(2)),
      data: jsonData,
      headers: resHeaders,
      cookies: setCookiesReceived,
    };
  }

  const cookiesList = res.cookies || [];
  if (res.headers) {
    for (const k of Object.keys(res.headers)) {
      if (k.toLowerCase() === 'set-cookie' && res.headers[k]) cookiesList.push(res.headers[k]);
    }
  }

  let updatedJar = [...cookieJar];
  for (const sc of cookiesList) {
    const parsed = parseSetCookie(sc, targetUrl);
    if (parsed) {
      updatedJar = updatedJar.filter((c) => !(c.name === parsed.name && c.domain === parsed.domain && c.path === parsed.path));
      updatedJar.push(parsed);
    }
  }

  const isSuccess = res.status >= 200 && res.status < 400;
  return {
    result: {
      status: res.status,
      statusText: res.statusText || (res.status === 0 ? 'Network Error' : isSuccess ? 'OK' : 'Error'),
      durationMs: res.durationMs || Date.now() - startTs,
      sizeKb: res.sizeKb || 0,
      data: res.data,
      headers: res.headers || {},
    },
    newCookies: updatedJar,
  };
}
