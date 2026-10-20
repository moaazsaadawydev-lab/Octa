import { useState, useEffect, useCallback } from 'react';
import {
  BrowserTab,
  ViewportMode,
  DEFAULT_BROWSER_URL,
  formatLocalhostUrl,
  extractPortOrHost,
} from '../types';

const STORAGE_KEY = 'octa_browser_tabs';

function createDefaultTab(url = DEFAULT_BROWSER_URL): BrowserTab {
  return {
    id: `btab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: extractPortOrHost(url),
    url,
    viewportMode: 'desktop',
    reloadKey: 0,
  };
}

export function useBrowserTabs() {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [createDefaultTab()];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '');

  // Persist tabs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {}
  }, [tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const addTab = useCallback((initialUrl?: string) => {
    const formatted = formatLocalhostUrl(initialUrl || DEFAULT_BROWSER_URL);
    const newTab = createDefaultTab(formatted);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback((tabIdToClose: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) {
        // Always keep at least one tab
        const fresh = createDefaultTab();
        setActiveTabId(fresh.id);
        return [fresh];
      }

      const filtered = prev.filter((t) => t.id !== tabIdToClose);
      if (activeTabId === tabIdToClose) {
        const index = prev.findIndex((t) => t.id === tabIdToClose);
        const nextIndex = Math.max(0, index - 1);
        setActiveTabId(filtered[nextIndex]?.id || filtered[0].id);
      }
      return filtered;
    });
  }, [activeTabId]);

  const updateActiveUrl = useCallback((rawUrl: string) => {
    const formatted = formatLocalhostUrl(rawUrl);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              url: formatted,
              title: extractPortOrHost(formatted),
              reloadKey: t.reloadKey + 1,
            }
          : t
      )
    );
  }, [activeTabId]);

  const setViewportMode = useCallback((mode: ViewportMode) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, viewportMode: mode } : t))
    );
  }, [activeTabId]);

  const reloadActiveTab = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, reloadKey: t.reloadKey + 1 } : t))
    );
  }, [activeTabId]);

  const updateTabMeta = useCallback((tabId: string, meta: { title?: string; faviconUrl?: string }) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        const newTitle = meta.title && meta.title.trim() ? meta.title.trim() : t.title;
        const newFavicon = meta.faviconUrl !== undefined ? meta.faviconUrl : t.faviconUrl;
        if (newTitle === t.title && newFavicon === t.faviconUrl) return t;
        return {
          ...t,
          title: newTitle,
          faviconUrl: newFavicon,
        };
      })
    );
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    addTab,
    closeTab,
    updateActiveUrl,
    setViewportMode,
    reloadActiveTab,
    updateTabMeta,
  };
}
