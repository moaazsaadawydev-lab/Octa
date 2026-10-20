import { useState, useEffect, useCallback } from 'react';
import {
  BrowserHistoryItem,
  DEFAULT_DEV_PORTS,
  extractPortNumber,
  formatLocalhostUrl,
} from '../types';

const HISTORY_STORAGE_KEY = 'octa_browser_history';
const RECENT_PORTS_KEY = 'octa_browser_recent_ports';
const MAX_HISTORY_ITEMS = 100;
const MAX_RECENT_PORTS = 5;

export function useBrowserHistory() {
  const [history, setHistory] = useState<BrowserHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [recentPorts, setRecentPorts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_PORTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = Array.from(new Set([...parsed, ...DEFAULT_DEV_PORTS]));
          return merged.slice(0, MAX_RECENT_PORTS);
        }
      }
    } catch {}
    return DEFAULT_DEV_PORTS;
  });

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  // Persist recent ports
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_PORTS_KEY, JSON.stringify(recentPorts));
    } catch {}
  }, [recentPorts]);

  const recordVisit = useCallback((rawUrl: string, title?: string) => {
    const formatted = formatLocalhostUrl(rawUrl);
    const port = extractPortNumber(formatted);

    // 1. Update Recent Ports (MRU - Most Recently Used)
    if (port) {
      setRecentPorts((prev) => {
        const next = [port, ...prev.filter((p) => p !== port)];
        const merged = Array.from(new Set([...next, ...DEFAULT_DEV_PORTS]));
        return merged.slice(0, MAX_RECENT_PORTS);
      });
    }

    // 2. Update History
    setHistory((prev) => {
      const now = Date.now();
      const existingIndex = prev.findIndex((item) => item.url === formatted);
      let updated: BrowserHistoryItem[];

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const updatedItem: BrowserHistoryItem = {
          ...existing,
          title: title && title.trim() ? title.trim() : existing.title,
          visitCount: existing.visitCount + 1,
          lastVisitedAt: now,
          port: port || existing.port,
        };
        updated = [
          updatedItem,
          ...prev.slice(0, existingIndex),
          ...prev.slice(existingIndex + 1),
        ];
      } else {
        const newItem: BrowserHistoryItem = {
          url: formatted,
          title: title && title.trim() ? title.trim() : undefined,
          port: port || undefined,
          visitCount: 1,
          lastVisitedAt: now,
        };
        updated = [newItem, ...prev];
      }

      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const updateHistoryTitle = useCallback((rawUrl: string, title: string) => {
    if (!title || !title.trim()) return;
    const formatted = formatLocalhostUrl(rawUrl);
    const cleanTitle = title.trim();

    setHistory((prev) =>
      prev.map((item) =>
        item.url === formatted ? { ...item, title: cleanTitle } : item
      )
    );
  }, []);

  const removeHistoryItem = useCallback((urlToRemove: string) => {
    setHistory((prev) => prev.filter((item) => item.url !== urlToRemove));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getSuggestions = useCallback(
    (query: string): BrowserHistoryItem[] => {
      const q = query.trim().toLowerCase();
      // If query is empty, return top visited items
      if (!q) {
        return [...history]
          .sort((a, b) => b.visitCount - a.visitCount || b.lastVisitedAt - a.lastVisitedAt)
          .slice(0, 6);
      }

      // Filter and rank
      return history
        .filter((item) => {
          const matchUrl = item.url.toLowerCase().includes(q);
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchPort = item.port?.includes(q);
          return matchUrl || matchTitle || matchPort;
        })
        .sort((a, b) => {
          // Priority 1: exact port match or starts-with
          const aStarts = a.url.toLowerCase().includes(q) || a.port === q;
          const bStarts = b.url.toLowerCase().includes(q) || b.port === q;
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          // Priority 2: Higher visit count
          if (b.visitCount !== a.visitCount) {
            return b.visitCount - a.visitCount;
          }

          // Priority 3: More recently visited
          return b.lastVisitedAt - a.lastVisitedAt;
        })
        .slice(0, 8);
    },
    [history]
  );

  return {
    history,
    recentPorts,
    recordVisit,
    updateHistoryTitle,
    removeHistoryItem,
    clearHistory,
    getSuggestions,
  };
}
