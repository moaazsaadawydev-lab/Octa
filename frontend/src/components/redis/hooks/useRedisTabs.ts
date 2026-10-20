import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { RedisConnectionConfig, RedisTab, ZSetMember } from '../types';
import { getRedisKeyDetails, updateRedisKey, setRedisTTL } from '../../../services/api';
import { mapDetailToTabUpdates, extractTabPayload } from './redisTabHelpers';

interface UseRedisTabsProps {
  activeConn: (RedisConnectionConfig & { db: number }) | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onKeyModified?: () => void;
}

export function useRedisTabs({ activeConn, showToast, onKeyModified }: UseRedisTabsProps) {
  const [tabs, setTabs] = useState<RedisTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabKeyRef = useRef(activeTabKey);
  activeTabKeyRef.current = activeTabKey;

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.key === activeTabKey) || null;
  }, [tabs, activeTabKey]);

  const handleCloseTab = useCallback((keyToClose: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.key !== keyToClose);
      if (activeTabKeyRef.current === keyToClose) {
        if (filtered.length > 0) {
          const closingIdx = prev.findIndex((t) => t.key === keyToClose);
          setActiveTabKey(filtered[Math.max(0, closingIdx - 1)]?.key || null);
        } else {
          setActiveTabKey(null);
        }
      }
      return filtered;
    });
  }, []);

  const handleOpenKeyInTab = useCallback(async (keyName: string) => {
    if (tabsRef.current.some((t) => t.key === keyName)) {
      setActiveTabKey(keyName);
      return;
    }
    if (!activeConn) return;

    const newTab: RedisTab = {
      id: keyName,
      key: keyName,
      type: 'string',
      detail: null,
      isLoading: true,
      isDirty: false,
      draftString: '',
      draftHash: [],
      draftList: [],
      draftSet: [],
      draftZSet: [],
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabKey(keyName);

    try {
      const detail = await getRedisKeyDetails(activeConn, keyName);
      if (detail && detail.ttl !== -2) {
        setTabs((prev) =>
          prev.map((t) => (t.key === keyName ? { ...t, ...mapDetailToTabUpdates(detail) } : t))
        );
      } else {
        showToast(`Key "${keyName}" no longer exists or expired`, 'info');
        handleCloseTab(keyName);
      }
    } catch (err: any) {
      showToast(`Failed to fetch key details: ${err?.message || err}`, 'error');
      setTabs((prev) => prev.map((t) => (t.key === keyName ? { ...t, isLoading: false } : t)));
    }
  }, [activeConn, handleCloseTab, showToast]);

  const handleRefreshKey = useCallback(async (keyName?: string) => {
    const targetKey = keyName || activeTabKeyRef.current;
    if (!targetKey || !activeConn) return;

    setIsRefreshing(true);
    try {
      const detail = await getRedisKeyDetails(activeConn, targetKey);
      if (detail && detail.ttl !== -2) {
        setTabs((prev) =>
          prev.map((t) => (t.key === targetKey ? { ...t, ...mapDetailToTabUpdates(detail) } : t))
        );
        showToast(`Refreshed "${targetKey}"`, 'success');
      } else {
        showToast(`Key "${targetKey}" no longer exists or expired`, 'info');
        handleCloseTab(targetKey);
      }
    } catch (err: any) {
      showToast(`Failed to refresh key: ${err?.message || err}`, 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [activeConn, handleCloseTab, showToast]);

  // 1. Live 1-second TTL countdown & auto-close on expiration
  useEffect(() => {
    if (!activeConn || tabs.length === 0) return;

    const timer = setInterval(() => {
      const currentTabs = tabsRef.current;
      const expiringKeys: string[] = [];

      setTabs((prev) =>
        prev.map((t) => {
          if (t.detail && t.detail.ttl > 0) {
            const nextTtl = t.detail.ttl - 1;
            if (nextTtl <= 0) {
              expiringKeys.push(t.key);
            }
            return { ...t, detail: { ...t.detail, ttl: nextTtl } };
          }
          return t;
        })
      );

      if (expiringKeys.length > 0) {
        expiringKeys.forEach(async (key) => {
          try {
            const detail = await getRedisKeyDetails(activeConn, key);
            if (!detail || detail.ttl === -2) {
              handleCloseTab(key);
              showToast(`Key "${key}" expired and tab was closed`, 'info');
              onKeyModified?.();
            }
          } catch {
            handleCloseTab(key);
            showToast(`Key "${key}" expired and tab was closed`, 'info');
            onKeyModified?.();
          }
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeConn, tabs.length, handleCloseTab, showToast, onKeyModified]);

  // 2. Periodic check (every 3s) & window focus check to detect if server deleted/expired key
  useEffect(() => {
    if (!activeConn || tabs.length === 0) return;

    const checkTabs = async () => {
      const currentTabs = [...tabsRef.current];
      for (const t of currentTabs) {
        try {
          const detail = await getRedisKeyDetails(activeConn, t.key);
          if (!detail || detail.ttl === -2) {
            handleCloseTab(t.key);
            showToast(`Key "${t.key}" was removed from Redis and closed`, 'info');
            onKeyModified?.();
          }
        } catch {}
      }
    };

    const interval = setInterval(checkTabs, 3000);
    window.addEventListener('focus', checkTabs);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkTabs);
    };
  }, [activeConn, tabs.length, handleCloseTab, showToast, onKeyModified]);

  const handleSaveActiveTabKey = async () => {
    if (!activeTab || !activeTab.detail || !activeConn) return;
    setIsSaving(true);
    try {
      const payload = extractTabPayload(activeTab);
      const ok = await updateRedisKey(activeConn, activeTab.key, activeTab.type, payload, activeTab.detail.ttl);
      if (ok) {
        showToast(`Key "${activeTab.key}" saved successfully`, 'success');
        setTabs((prev) => prev.map((t) => (t.key === activeTab.key ? { ...t, isDirty: false } : t)));
        onKeyModified?.();
      } else {
        showToast('Failed to save key changes', 'error');
      }
    } catch (err: any) {
      showToast(`Error saving key: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTTL = async (ttlSec: number) => {
    if (!activeTab || !activeTab.detail || !activeConn) return;
    try {
      const ok = await setRedisTTL(activeConn, activeTab.key, ttlSec);
      if (ok) {
        showToast(ttlSec === -1 ? `Key "${activeTab.key}" is persistent` : `TTL set to ${ttlSec}s`, 'success');
        setTabs((prev) =>
          prev.map((t) => (t.key === activeTab.key && t.detail ? { ...t, detail: { ...t.detail, ttl: ttlSec } } : t))
        );
      } else {
        showToast('Failed to update TTL', 'error');
      }
    } catch (err: any) {
      showToast(`Error setting TTL: ${err?.message || err}`, 'error');
    }
  };

  const updateDraft = (field: keyof RedisTab, val: any) => {
    if (!activeTab) return;
    setTabs((prev) => prev.map((t) => (t.key === activeTab.key ? { ...t, [field]: val, isDirty: true } : t)));
  };

  return {
    tabs,
    setTabs,
    activeTabKey,
    setActiveTabKey,
    activeTab,
    isSaving,
    isRefreshing,
    handleOpenKeyInTab,
    handleCloseTab,
    handleRefreshKey,
    handleSaveActiveTabKey,
    handleUpdateTTL,
    updateDraftString: (val: string) => updateDraft('draftString', val),
    updateDraftHash: (hash: Array<{ field: string; value: string }>) => updateDraft('draftHash', hash),
    updateDraftList: (list: string[]) => updateDraft('draftList', list),
    updateDraftSet: (set: string[]) => updateDraft('draftSet', set),
    updateDraftZSet: (zset: ZSetMember[]) => updateDraft('draftZSet', zset),
  };
}
