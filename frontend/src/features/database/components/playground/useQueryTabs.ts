import { useState, useCallback, useMemo } from 'react';
import { QueryTab, QueryResult, ExplainPlanResult } from '../../types';

export const DEFAULT_QUERY = `-- Octa SQL Playground\n-- Press Ctrl + Enter to run selected text or full query\n\nSELECT \n  'Octa' AS application,\n  'Database Management & SQL Workspace' AS milestone,\n  NOW() AS executed_at;\n`;

export interface UseQueryTabsOptions {
  propTabs?: QueryTab[];
  propActiveTabId?: string | null;
  onTabsChange?: (tabs: QueryTab[]) => void;
  onActiveTabChange?: (tabId: string | null) => void;
}

export function useQueryTabs({
  propTabs,
  propActiveTabId,
  onTabsChange,
  onActiveTabChange,
}: UseQueryTabsOptions = {}) {
  const [internalTabs, setInternalTabs] = useState<QueryTab[]>([
    { id: 'tab-1', title: 'Query 1.sql', query: DEFAULT_QUERY, isDirty: false, results: null },
  ]);
  const [internalActiveTabId, setInternalActiveTabId] = useState<string | null>('tab-1');

  const rawTabs = propTabs !== undefined ? propTabs : internalTabs;
  
  // Deduplicate tabs by unique ID
  const tabs = useMemo(() => {
    const seen = new Set<string>();
    const unique: QueryTab[] = [];
    for (const tab of rawTabs) {
      if (!seen.has(tab.id)) {
        seen.add(tab.id);
        unique.push(tab);
      }
    }
    return unique.length > 0
      ? unique
      : [{ id: 'tab-1', title: 'Query 1.sql', query: DEFAULT_QUERY, isDirty: false, results: null }];
  }, [rawTabs]);

  const setTabs = useCallback(
    (updater: QueryTab[] | ((prev: QueryTab[]) => QueryTab[])) => {
      const next = typeof updater === 'function' ? updater(tabs) : updater;
      if (onTabsChange) {
        onTabsChange(next);
      } else {
        setInternalTabs(next);
      }
    },
    [tabs, onTabsChange]
  );

  const activeTabId = propActiveTabId !== undefined ? propActiveTabId : internalActiveTabId;
  const setActiveTabId = useCallback(
    (id: string | null) => {
      if (onActiveTabChange) onActiveTabChange(id);
      else setInternalActiveTabId(id);
    },
    [onActiveTabChange]
  );

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
  }, [tabs, activeTabId]);

  const handleAddTab = useCallback(() => {
    let maxNum = 0;
    tabs.forEach((t) => {
      const match = t.title.match(/^Query\s*(\d+)\.sql$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const newId = 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const newTitle = `Query ${maxNum + 1}.sql`;
    const newTab: QueryTab = {
      id: newId,
      title: newTitle,
      query: DEFAULT_QUERY,
      isDirty: false,
      results: null,
    };

    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  }, [tabs, setTabs, setActiveTabId]);

  const handleCloseTab = useCallback(
    (id: string) => {
      const filtered = tabs.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        const freshId = 'tab-' + Date.now();
        const freshTab: QueryTab = {
          id: freshId,
          title: 'Query 1.sql',
          query: DEFAULT_QUERY,
          isDirty: false,
          results: null,
        };
        setTabs([freshTab]);
        setActiveTabId(freshId);
        return;
      }

      setTabs(filtered);
      if (activeTabId === id) {
        const closedIdx = tabs.findIndex((t) => t.id === id);
        const nextActive = filtered[Math.min(closedIdx, filtered.length - 1)];
        setActiveTabId(nextActive?.id || null);
      }
    },
    [tabs, activeTabId, setTabs, setActiveTabId]
  );

  const handleRenameTab = useCallback(
    (id: string, newTitle: string) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t)));
    },
    [setTabs]
  );

  const handleUpdateTabQuery = useCallback(
    (query: string) => {
      if (!activeTab) return;
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab.id ? { ...t, query, isDirty: true } : t))
      );
    },
    [activeTab, setTabs]
  );

  return {
    tabs,
    setTabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    handleAddTab,
    handleCloseTab,
    handleRenameTab,
    handleUpdateTabQuery,
  };
}
