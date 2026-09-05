import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HttpRequestItem,
  StoredCookie,
  HttpResponseState,
  Environment,
  EnvironmentVariable,
} from '../types';
import { dispatchHttpRequest, fileToBase64 } from '../utils/requestDispatcher';

export interface UseHttpClientOptions {
  activeRequest: HttpRequestItem | null;
  activeEnvironment: Environment | null;
  globalVariables: EnvironmentVariable[];
  updateActiveRequest: (updated: HttpRequestItem) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useHttpClient({
  activeRequest,
  activeEnvironment,
  globalVariables,
  updateActiveRequest,
  showToast,
}: UseHttpClientOptions) {
  const [cookieJar, setCookieJar] = useState<StoredCookie[]>(() => {
    try {
      const saved = localStorage.getItem('octa_cookie_jar');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cookie jar from localStorage', e);
    }
    return [];
  });

  const saveCookieJar = useCallback((newJar: StoredCookie[]) => {
    setCookieJar(newJar);
    try {
      localStorage.setItem('octa_cookie_jar', JSON.stringify(newJar));
    } catch (e) {
      console.warn('Failed to persist cookie jar', e);
    }
  }, []);

  const [isCookieJarOpen, setIsCookieJarOpen] = useState(false);
  const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body'>('params');
  const [showAutoHeaders, setShowAutoHeaders] = useState<boolean>(() => {
    const saved = localStorage.getItem('octa_show_auto_headers');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('octa_show_auto_headers', String(showAutoHeaders));
  }, [showAutoHeaders]);

  const [layoutOrientation, setLayoutOrientation] = useState<'horizontal' | 'vertical'>(() => {
    const saved = localStorage.getItem('octa_http_layout_orientation');
    return saved === 'vertical' ? 'vertical' : 'horizontal';
  });

  useEffect(() => {
    localStorage.setItem('octa_http_layout_orientation', layoutOrientation);
  }, [layoutOrientation]);

  const [isSending, setIsSending] = useState(false);
  const [responseMap, setResponseMap] = useState<Record<string, HttpResponseState>>({});
  const activeResponseState = useMemo(() => (activeRequest ? responseMap[activeRequest.id] || null : null), [activeRequest, responseMap]);

  const handleSendRequest = useCallback(async () => {
    if (!activeRequest) return;
    if (!activeRequest.url.trim()) {
      showToast('Please enter a request URL', 'error');
      return;
    }
    setIsSending(true);
    const reqId = activeRequest.id;

    try {
      const { result, newCookies } = await dispatchHttpRequest({
        activeRequest,
        activeEnvironment,
        globalVariables,
        cookieJar,
      });

      if (newCookies.length !== cookieJar.length) {
        saveCookieJar(newCookies);
      }

      setResponseMap((prev) => ({ ...prev, [reqId]: result }));
      if (result.status === 0) {
        showToast('Network error: ' + (result.data?.error || 'Check server connection'), 'error');
      } else {
        const isSuccess = result.status >= 200 && result.status < 400;
        showToast(`Response: ${result.status} ${result.statusText}`, isSuccess ? 'success' : 'error');
      }
    } catch (err: any) {
      const errorResult: HttpResponseState = {
        status: 0,
        statusText: 'Network Error',
        durationMs: 0,
        sizeKb: 0,
        data: { error: err?.message || String(err) },
        headers: {},
      };
      setResponseMap((prev) => ({ ...prev, [reqId]: errorResult }));
      showToast('Request failed: ' + (err?.message || err), 'error');
    } finally {
      setIsSending(false);
    }
  }, [activeRequest, activeEnvironment, globalVariables, cookieJar, saveCookieJar, showToast]);

  const handleToggleAutoHeader = useCallback(
    (headerKey: string, enable: boolean) => {
      if (!activeRequest) return;
      const currentDisabled = (activeRequest.disabledAutoHeaders || []).map((k) => k.toLowerCase());
      const targetKey = headerKey.toLowerCase();
      const nextDisabled = enable
        ? currentDisabled.filter((k) => k !== targetKey)
        : currentDisabled.includes(targetKey)
        ? currentDisabled
        : [...currentDisabled, targetKey];
      updateActiveRequest({ ...activeRequest, disabledAutoHeaders: nextDisabled });
    },
    [activeRequest, updateActiveRequest]
  );

  const handleFormatJson = useCallback(() => {
    if (!activeRequest || !activeRequest.bodyContent?.trim()) return;
    try {
      const parsed = JSON.parse(activeRequest.bodyContent);
      updateActiveRequest({ ...activeRequest, bodyContent: JSON.stringify(parsed, null, 2) });
      showToast('JSON Formatted', 'success');
    } catch (e: any) {
      showToast('Invalid JSON: ' + e?.message, 'error');
    }
  }, [activeRequest, updateActiveRequest, showToast]);

  const handleMinifyJson = useCallback(() => {
    if (!activeRequest || !activeRequest.bodyContent?.trim()) return;
    try {
      const parsed = JSON.parse(activeRequest.bodyContent);
      updateActiveRequest({ ...activeRequest, bodyContent: JSON.stringify(parsed) });
      showToast('JSON Minified', 'success');
    } catch (e: any) {
      showToast('Invalid JSON: ' + e?.message, 'error');
    }
  }, [activeRequest, updateActiveRequest, showToast]);

  const handleClearJson = useCallback(() => {
    if (activeRequest) updateActiveRequest({ ...activeRequest, bodyContent: '' });
  }, [activeRequest, updateActiveRequest]);

  return {
    cookieJar,
    saveCookieJar,
    isCookieJarOpen,
    setIsCookieJarOpen,
    isSending,
    responseMap,
    activeResponseState,
    requestTab,
    setRequestTab,
    showAutoHeaders,
    setShowAutoHeaders,
    layoutOrientation,
    setLayoutOrientation,
    handleSendRequest,
    handleToggleAutoHeader,
    handleFormatJson,
    handleMinifyJson,
    handleClearJson,
    fileToBase64,
  };
}
