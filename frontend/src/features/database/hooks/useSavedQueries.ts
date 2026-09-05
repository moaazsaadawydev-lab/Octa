import { useState, useEffect, useCallback, useRef } from 'react';
import { SqlQueryFolder, SqlQueryItem, SqlTreeItem } from '../types';
import { loadSqlQueriesData, saveSqlQueriesData } from '../../../services/api';
import {
  DEFAULT_INITIAL_QUERIES,
  createDefaultFolder,
  createDefaultQuery,
  isDescendantQuery,
} from '../utils/treeHelpers';

export interface UseSavedQueriesOptions {
  propQueriesTree?: (SqlQueryFolder | SqlQueryItem)[];
  onSaveQueriesTree?: (tree: (SqlQueryFolder | SqlQueryItem)[]) => void;
}

export function useSavedQueries({ propQueriesTree, onSaveQueriesTree }: UseSavedQueriesOptions = {}) {
  const [internalQueriesTree, setInternalQueriesTree] = useState<(SqlQueryFolder | SqlQueryItem)[]>(() => {
    try {
      const saved = localStorage.getItem('octa_sql_queries_tree');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse SQL queries from storage', e);
    }
    return DEFAULT_INITIAL_QUERIES;
  });

  const queriesTree = propQueriesTree !== undefined ? propQueriesTree : internalQueriesTree;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const [draggedQueryId, setDraggedQueryId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    id: string;
    position: 'inside' | 'before' | 'after';
  } | null>(null);

  useEffect(() => {
    if (propQueriesTree !== undefined) return;
    let isMounted = true;
    (async () => {
      try {
        const diskData = await loadSqlQueriesData();
        if (diskData && diskData.trim() && isMounted) {
          const parsed = JSON.parse(diskData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInternalQueriesTree(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load SQL queries data from backend disk:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [propQueriesTree]);

  const saveQueries = useCallback((nextTree: (SqlQueryFolder | SqlQueryItem)[]) => {
    if (onSaveQueriesTree) {
      onSaveQueriesTree(nextTree);
    } else {
      setInternalQueriesTree(nextTree);
      try {
        const jsonStr = JSON.stringify(nextTree);
        localStorage.setItem('octa_sql_queries_tree', jsonStr);
        saveSqlQueriesData(jsonStr).catch((err) => {
          console.warn('Backend saveSqlQueriesData failed:', err);
        });
      } catch (e) {
        console.warn('Failed to persist SQL queries tree:', e);
      }
    }
  }, [onSaveQueriesTree]);

  const commitQueryRename = useCallback(() => {
    if (!editingId) return;
    let finalName = editingName.trim();
    if (!finalName) {
      setEditingId(null);
      return;
    }

    const renameInTree = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
      return items.map((item) => {
        if (item.id === editingId) {
          if (item.type === 'query' && !finalName.endsWith('.sql')) {
            finalName += '.sql';
          }
          return { ...item, name: finalName, updatedAt: Date.now() };
        }
        if (item.type === 'folder') {
          return { ...item, items: renameInTree(item.items) as (SqlQueryFolder | SqlQueryItem)[] };
        }
        return item;
      });
    };

    saveQueries(renameInTree(queriesTree));
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, queriesTree, saveQueries]);

  const handleToggleFolder = useCallback((folderId: string) => {
    const toggleInTree = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
      return items.map((item) => {
        if (item.id === folderId && item.type === 'folder') {
          return { ...item, isOpen: !item.isOpen };
        }
        if (item.type === 'folder') {
          return { ...item, items: toggleInTree(item.items) };
        }
        return item;
      });
    };
    saveQueries(toggleInTree(queriesTree));
  }, [queriesTree, saveQueries]);

  const handleDeleteItem = useCallback((id: string) => {
    const deleteFromTree = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.type === 'folder') {
            return { ...item, items: deleteFromTree(item.items) };
          }
          return item;
        });
    };
    saveQueries(deleteFromTree(queriesTree));
  }, [queriesTree, saveQueries]);

  const handleCreateFolder = useCallback((parentId: string | null = null) => {
    const newFolder = createDefaultFolder('New Folder');
    if (!parentId) {
      saveQueries([...queriesTree, newFolder]);
    } else {
      const addToParent = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
        return items.map((item) => {
          if (item.id === parentId && item.type === 'folder') {
            return { ...item, isOpen: true, items: [...item.items, newFolder] };
          }
          if (item.type === 'folder') {
            return { ...item, items: addToParent(item.items) };
          }
          return item;
        });
      };
      saveQueries(addToParent(queriesTree));
    }
    setEditingId(newFolder.id);
    setEditingName(newFolder.name);
  }, [queriesTree, saveQueries]);

  const handleCreateQuery = useCallback((parentId: string | null = null) => {
    const newQuery = createDefaultQuery('Untitled.sql');
    if (!parentId) {
      saveQueries([...queriesTree, newQuery]);
    } else {
      const addToParent = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
        return items.map((item) => {
          if (item.id === parentId && item.type === 'folder') {
            return { ...item, isOpen: true, items: [...item.items, newQuery] };
          }
          if (item.type === 'folder') {
            return { ...item, items: addToParent(item.items) };
          }
          return item;
        });
      };
      saveQueries(addToParent(queriesTree));
    }
    setEditingId(newQuery.id);
    setEditingName(newQuery.name);
  }, [queriesTree, saveQueries]);

  return {
    queriesTree,
    saveQueries,
    editingId,
    setEditingId,
    editingName,
    setEditingName,
    editInputRef,
    commitQueryRename,
    handleToggleFolder,
    handleDeleteItem,
    handleCreateFolder,
    handleCreateQuery,
    draggedQueryId,
    setDraggedQueryId,
    dragOverTarget,
    setDragOverTarget,
  };
}
