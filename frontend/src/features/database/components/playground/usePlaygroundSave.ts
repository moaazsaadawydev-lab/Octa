import { useState, useCallback } from 'react';
import { QueryTab, SqlQueryItem, SqlQueryFolder, SqlTreeItem } from '../../types';

export interface UsePlaygroundSaveOptions {
  activeTab: QueryTab | null;
  queriesTree: (SqlQueryFolder | SqlQueryItem)[];
  onSaveQueriesTree?: (tree: (SqlQueryFolder | SqlQueryItem)[]) => void;
  activeDatabase?: string;
  setTabs: (updater: QueryTab[] | ((prev: QueryTab[]) => QueryTab[])) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function usePlaygroundSave({
  activeTab,
  queriesTree,
  onSaveQueriesTree,
  activeDatabase,
  setTabs,
  showToast,
}: UsePlaygroundSaveOptions) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalName, setSaveModalName] = useState('Untitled.sql');
  const [saveModalFolderId, setSaveModalFolderId] = useState('');

  // Helper to find a query in the tree
  const findQueryInTree = useCallback(
    (items: SqlTreeItem[], targetId: string): SqlQueryItem | null => {
      for (const item of items) {
        if (item.id === targetId && item.type === 'query') return item;
        if (item.type === 'folder') {
          const found = findQueryInTree(item.items, targetId);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  // Helper to update a query in the tree
  const updateQueryInTree = useCallback(
    (
      items: (SqlQueryFolder | SqlQueryItem)[],
      targetId: string,
      newContent: string,
      db?: string
    ): (SqlQueryFolder | SqlQueryItem)[] => {
      return items.map((item) => {
        if (item.id === targetId && item.type === 'query') {
          return {
            ...item,
            content: newContent,
            database: db || item.database,
            updatedAt: Date.now(),
          };
        }
        if (item.type === 'folder') {
          return {
            ...item,
            items: updateQueryInTree(item.items, targetId, newContent, db) as (SqlQueryFolder | SqlQueryItem)[],
          };
        }
        return item;
      });
    },
    []
  );

  const handleTriggerSave = useCallback(() => {
    if (!activeTab) return;

    const existingTargetId = activeTab.savedQueryId || activeTab.id;
    const existingInTree = findQueryInTree(queriesTree, existingTargetId);

    if (existingInTree && onSaveQueriesTree) {
      // Direct quick-save without popup
      const updatedTree = updateQueryInTree(queriesTree, existingTargetId, activeTab.query, activeDatabase);
      onSaveQueriesTree(updatedTree);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab.id ? { ...t, isDirty: false } : t))
      );
      showToast(`Saved query "${activeTab.title}"`, 'success');
    } else {
      // Open modal to choose folder & name for new query
      setSaveModalName(activeTab.title || 'Untitled.sql');
      setIsSaveModalOpen(true);
    }
  }, [activeTab, queriesTree, onSaveQueriesTree, activeDatabase, findQueryInTree, updateQueryInTree, setTabs, showToast]);

  const handleConfirmSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeTab || !saveModalName.trim() || !onSaveQueriesTree) return;

      let name = saveModalName.trim();
      if (!name.endsWith('.sql')) name += '.sql';

      const newQuery: SqlQueryItem = {
        id: 'query-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        type: 'query',
        name,
        content: activeTab.query,
        database: activeDatabase,
        createdAt: Date.now(),
      };

      if (!saveModalFolderId) {
        onSaveQueriesTree([...queriesTree, newQuery]);
      } else {
        const insert = (items: SqlTreeItem[]): SqlTreeItem[] =>
          items.map((it) =>
            it.id === saveModalFolderId && it.type === 'folder'
              ? { ...it, isOpen: true, items: [newQuery, ...it.items] }
              : it.type === 'folder'
              ? { ...it, items: insert(it.items) }
              : it
          );
        onSaveQueriesTree(insert(queriesTree) as (SqlQueryFolder | SqlQueryItem)[]);
      }

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? { ...t, id: newQuery.id, savedQueryId: newQuery.id, title: name, isDirty: false }
            : t
        )
      );
      setIsSaveModalOpen(false);
      showToast(`Saved query "${name}" to QUERIES`, 'success');
    },
    [activeTab, saveModalName, saveModalFolderId, queriesTree, onSaveQueriesTree, activeDatabase, setTabs, showToast]
  );

  return {
    isSaveModalOpen,
    setIsSaveModalOpen,
    saveModalName,
    setSaveModalName,
    saveModalFolderId,
    setSaveModalFolderId,
    handleTriggerSave,
    handleConfirmSave,
  };
}
