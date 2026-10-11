import { useState, useMemo, useCallback } from 'react';
import { RedisConnectionConfig, RedisTab, RedisKeyDetail, ZSetMember } from '../types';
import { getRedisKeyDetails, updateRedisKey, setRedisTTL } from '../../../services/api';

interface UseRedisTabsProps {
  activeConn: (RedisConnectionConfig & { db: number }) | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onKeyModified?: () => void;
}

const mapDetailToTabUpdates = (detail: RedisKeyDetail) => ({
  type: detail.type,
  detail,
  isLoading: false,
  isDirty: false,
  draftString: detail.stringValue || '',
  draftHash: detail.hashValue
    ? Object.entries(detail.hashValue).map(([field, value]) => ({ field, value }))
    : [],
  draftList: detail.listValue || [],
  draftSet: detail.setValue || [],
  draftZSet: detail.zsetValue || [],
});

export function useRedisTabs({ activeConn, showToast, onKeyModified }: UseRedisTabsProps) {
  const [tabs, setTabs] = useState<RedisTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.key === activeTabKey) || null;
  }, [tabs, activeTabKey]);

  const handleCloseTab = useCallback((keyToClose: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.key !== keyToClose);
      if (activeTabKey === keyToClose) {
        if (filtered.length > 0) {
          const closingIdx = prev.findIndex((t) => t.key === keyToClose);
          setActiveTabKey(filtered[Math.max(0, closingIdx - 1)]?.key || null);
        } else {
          setActiveTabKey(null);
        }
      }
      return filtered;
    });
  }, [activeTabKey]);

  const handleOpenKeyInTab = useCallback(async (keyName: string) => {
    if (tabs.some((t) => t.key === keyName)) {
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
      if (detail) {
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
  }, [activeConn, tabs, handleCloseTab, showToast]);

  const handleRefreshKey = useCallback(async (keyName?: string) => {
    const targetKey = keyName || activeTabKey;
    if (!targetKey || !activeConn) return;

    setIsRefreshing(true);
    try {
      const detail = await getRedisKeyDetails(activeConn, targetKey);
      if (detail) {
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
  }, [activeConn, activeTabKey, handleCloseTab, showToast]);

  const handleSaveActiveTabKey = async () => {
    if (!activeTab || !activeTab.detail || !activeConn) return;
    setIsSaving(true);
    try {
      let payload: any = activeTab.draftString;
      if (activeTab.type === 'hash') {
        const hashObj: Record<string, string> = {};
        activeTab.draftHash.forEach((item) => {
          if (item.field.trim()) hashObj[item.field] = item.value;
        });
        payload = hashObj;
      } else if (activeTab.type === 'list') {
        payload = activeTab.draftList;
      } else if (activeTab.type === 'set') {
        payload = activeTab.draftSet;
      } else if (activeTab.type === 'zset') {
        payload = activeTab.draftZSet;
      }

      const ok = await updateRedisKey(
        activeConn,
        activeTab.key,
        activeTab.type,
        payload,
        activeTab.detail.ttl
      );

      if (ok) {
        showToast(`Key "${activeTab.key}" saved successfully`, 'success');
        setTabs((prev) =>
          prev.map((t) => (t.key === activeTab.key ? { ...t, isDirty: false } : t))
        );
        if (onKeyModified) onKeyModified();
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
        showToast(
          ttlSec === -1 ? `Key "${activeTab.key}" is now persistent` : `TTL set to ${ttlSec}s`,
          'success'
        );
        setTabs((prev) =>
          prev.map((t) =>
            t.key === activeTab.key && t.detail
              ? { ...t, detail: { ...t.detail, ttl: ttlSec } }
              : t
          )
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
    setTabs((prev) =>
      prev.map((t) => (t.key === activeTab.key ? { ...t, [field]: val, isDirty: true } : t))
    );
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
