import { useState, useRef, useCallback, useMemo } from 'react';
import {
  HttpFolderItem,
  HttpRequestItem,
  HttpParam,
  HttpBodyType,
  createDefaultCollection,
  createDefaultFolder,
  createDefaultRequest,
  parseQueryParamsFromUrl,
  buildUrlWithParams,
} from '../types';
import { normalizeCollections, findItemById } from '../utils/treeHelpers';
import {
  toggleFolderInTree,
  renameItemInTree,
  deleteItemFromTree,
  duplicateRequestInTree,
  insertItemInTree,
} from '../utils/treeMutations';
import { useTreeDragDrop } from './useTreeDragDrop';
import { mapPostmanCollection } from '../../../services/postmanMapper';

export interface UseCollectionsOptions {
  initialCollections?: HttpFolderItem[];
  onDataChange?: (collections: HttpFolderItem[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onPostmanImport?: (result: ReturnType<typeof mapPostmanCollection>) => void;
}

export function useCollections({
  initialCollections = [],
  onDataChange,
  showToast,
  onPostmanImport,
}: UseCollectionsOptions) {
  const [collections, setCollections] = useState<HttpFolderItem[]>(() => normalizeCollections(initialCollections));
  const [openTabs, setOpenTabs] = useState<HttpRequestItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRequest = useMemo(() => openTabs.find((t) => t.id === activeTabId) || null, [openTabs, activeTabId]);

  const saveTreeData = useCallback((nextCols: HttpFolderItem[]) => {
    setCollections(nextCols);
    onDataChange?.(nextCols);
  }, [onDataChange]);

  const dnd = useTreeDragDrop({ collections, saveTreeData });

  const updateActiveRequest = useCallback((updated: HttpRequestItem) => {
    setOpenTabs((prev) => prev.map((t) => (t.id === updated.id ? { ...updated, isDirty: true } : t)));
    const updateRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] =>
      items.map((item) => {
        if (item.id === updated.id) return { ...updated, isDirty: true };
        if (item.type !== 'request') return { ...item, items: updateRecursively(item.items) };
        return item;
      });
    saveTreeData(updateRecursively(collections) as HttpFolderItem[]);
  }, [collections, saveTreeData]);

  const handleOpenRequestInTab = useCallback((req: HttpRequestItem) => {
    setOpenTabs((prev) => (prev.some((t) => t.id === req.id) ? prev : [...prev, req]));
    setActiveTabId(req.id);
  }, []);

  const handleCloseTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const idx = openTabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    const nextTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(nextTabs);
    if (nextTabs.length === 0) setActiveTabId('');
    else if (activeTabId === tabId) setActiveTabId(nextTabs[Math.max(0, idx - 1)].id);
  }, [openTabs, activeTabId]);

  const handleNewTab = useCallback(() => {
    const newReq = createDefaultRequest('Untitled Request');
    if (collections.length > 0) {
      saveTreeData([{ ...collections[0], items: [newReq, ...collections[0].items] }, ...collections.slice(1)]);
    }
    setOpenTabs((prev) => [...prev, newReq]);
    setActiveTabId(newReq.id);
    setEditingId(newReq.id);
    setEditingName(newReq.name);
    showToast('New request tab opened', 'info');
  }, [collections, saveTreeData, showToast]);

  const commitNameEdit = useCallback(() => {
    if (!editingId) return;
    const finalName = editingName.trim();
    if (!finalName) { setEditingId(null); return; }
    saveTreeData(renameItemInTree(collections, editingId, finalName));
    setOpenTabs((prev) => prev.map((t) => (t.id === editingId ? { ...t, name: finalName } : t)));
    setEditingId(null);
  }, [editingId, editingName, collections, saveTreeData]);

  const handleCreateNewCollection = () => {
    const newCol = createDefaultCollection('Untitled Collection');
    saveTreeData([...collections, newCol]);
    setEditingId(newCol.id);
    setEditingName(newCol.name);
    setMenuOpenId(null);
    showToast('Created new collection', 'success');
  };

  const handleCreateFolder = (parentId: string | null) => {
    const newFolder = createDefaultFolder('New Folder');
    saveTreeData(insertItemInTree(collections, parentId, newFolder));
    setEditingId(newFolder.id);
    setEditingName(newFolder.name);
    setMenuOpenId(null);
    showToast('Created new folder', 'info');
  };

  const handleCreateNewRequest = (parentId?: string | null) => {
    const newReq = createDefaultRequest('Untitled Request');
    const targetParentId = parentId || (collections[0]?.id ?? null);
    saveTreeData(insertItemInTree(collections, targetParentId, newReq));
    handleOpenRequestInTab(newReq);
    setEditingId(newReq.id);
    setEditingName(newReq.name);
    setMenuOpenId(null);
    showToast('Created new request', 'info');
  };

  const handleDuplicateRequest = (reqId: string) => {
    const original = findItemById(collections, reqId) as HttpRequestItem;
    if (!original || original.type !== 'request') return;
    const duplicated: HttpRequestItem = {
      ...original,
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: original.name + ' (Copy)',
      isDirty: false,
    };
    saveTreeData(duplicateRequestInTree(collections, reqId, duplicated));
    handleOpenRequestInTab(duplicated);
    setMenuOpenId(null);
    showToast('Request duplicated', 'success');
  };

  const handleDeleteItem = (id: string) => {
    saveTreeData(deleteItemFromTree(collections, id));
    if (openTabs.some((t) => t.id === id)) handleCloseTab(id);
    setMenuOpenId(null);
    showToast('Deleted successfully', 'info');
  };

  const handleFileImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = mapPostmanCollection(json);
      const nextCols = [...collections, result.collection];
      saveTreeData(nextCols);
      onPostmanImport?.(result);
      showToast(`Imported "${result.collection.name}" (${result.totalRequests} requests, ${result.totalFolders} folders)`, 'success');
    } catch (err: any) {
      showToast(`Failed to import Postman collection: ${err?.message || err}`, 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return {
    collections,
    setCollections,
    openTabs,
    setOpenTabs,
    activeTabId,
    setActiveTabId,
    activeRequest,
    editingId,
    setEditingId,
    editingName,
    setEditingName,
    menuOpenId,
    setMenuOpenId,
    searchQuery,
    setSearchQuery,
    draggedId: dnd.draggedId,
    dragOverTarget: dnd.dragOverTarget,
    editInputRef,
    menuRef,
    fileInputRef,
    updateActiveRequest,
    handleOpenRequestInTab,
    handleCloseTab,
    handleNewTab,
    toggleFolderOpen: (folderId: string) => saveTreeData(toggleFolderInTree(collections, folderId)),
    commitNameEdit,
    handleCreateNewCollection,
    handleCreateFolder,
    handleCreateNewRequest,
    handleDuplicateRequest,
    handleDeleteItem,
    handleFileImportChange,
    handleDragStart: dnd.handleDragStart,
    handleDragOver: dnd.handleDragOver,
    handleDragLeave: dnd.handleDragLeave,
    handleDrop: dnd.handleDrop,
    handleUrlChange: (newUrl: string) => activeRequest && updateActiveRequest({ ...activeRequest, url: newUrl, params: parseQueryParamsFromUrl(newUrl, activeRequest.params) }),
    handleParamsChange: (newParams: HttpParam[]) => activeRequest && updateActiveRequest({ ...activeRequest, url: buildUrlWithParams(activeRequest.url, newParams), params: newParams }),
    handleSwitchBodyType: (newType: HttpBodyType) => activeRequest && updateActiveRequest({ ...activeRequest, bodyType: newType }),
  };
}
