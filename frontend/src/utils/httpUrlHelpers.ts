import { HttpParam } from '../types/http';

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
