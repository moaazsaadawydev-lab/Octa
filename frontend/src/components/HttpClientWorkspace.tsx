import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Plus,
  FolderPlus,
  Search,
  Copy,
  Trash2,
  Globe,
  Edit2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Layers,
  MoreVertical,
  Files,
  FileCode,
  Check,
  X
} from 'lucide-react';
import { saveHttpClientData, loadHttpClientData } from '../services/api';

export interface HttpHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpParam {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpRequestItem {
  id: string;
  type: 'request';
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: HttpHeader[];
  params: HttpParam[];
  bodyType: 'json' | 'raw' | 'none';
  bodyContent: string;
}

export interface HttpFolderItem {
  id: string;
  type: 'collection' | 'folder';
  name: string;
  isOpen?: boolean;
  items: (HttpFolderItem | HttpRequestItem)[];
}

export type HttpTreeItem = HttpFolderItem | HttpRequestItem;

export interface HttpResponseState {
  status: number;
  statusText: string;
  durationMs: number;
  sizeKb: number;
  data: any;
  headers: Record<string, string>;
}

const METHOD_COLORS: Record<string, { badge: string; text: string }> = {
  GET: { badge: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300', text: 'text-emerald-400' },
  POST: { badge: 'bg-amber-950/70 border-amber-500/40 text-amber-300', text: 'text-amber-400' },
  PUT: { badge: 'bg-blue-950/70 border-blue-500/40 text-blue-300', text: 'text-blue-400' },
  PATCH: { badge: 'bg-purple-950/70 border-purple-500/40 text-purple-300', text: 'text-purple-400' },
  DELETE: { badge: 'bg-rose-950/70 border-rose-500/40 text-rose-300', text: 'text-rose-400' },
};

const createDefaultRequest = (name: string = 'Untitled Request'): HttpRequestItem => ({
  id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'request',
  name,
  method: 'GET',
  url: '',
  headers: [],
  params: [],
  bodyType: 'none',
  bodyContent: '',
});

const createDefaultFolder = (name: string = 'New Folder'): HttpFolderItem => ({
  id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'folder',
  name,
  isOpen: true,
  items: [],
});

const createDefaultCollection = (name: string = 'Untitled Collection'): HttpFolderItem => ({
  id: 'col-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'collection',
  name,
  isOpen: true,
  items: [],
});

// Helper: Count total requests inside a folder / collection recursively
function countRequests(item: HttpTreeItem): number {
  if (item.type === 'request') return 1;
  return item.items.reduce((sum, child) => sum + countRequests(child), 0);
}

// Helper: Find first request in tree
function findFirstRequest(items: HttpTreeItem[]): HttpRequestItem | null {
  for (const item of items) {
    if (item.type === 'request') return item;
    const nested = findFirstRequest(item.items);
    if (nested) return nested;
  }
  return null;
}

// Helper: Check if targetId is a descendant of parentId
function isDescendant(tree: HttpTreeItem[], parentId: string, targetId: string): boolean {
  for (const item of tree) {
    if (item.id === parentId) {
      if (item.type === 'request') return false;
      const searchDescendants = (children: HttpTreeItem[]): boolean => {
        for (const child of children) {
          if (child.id === targetId) return true;
          if (child.type !== 'request' && searchDescendants(child.items)) return true;
        }
        return false;
      };
      return searchDescendants(item.items);
    }
    if (item.type !== 'request') {
      if (isDescendant(item.items, parentId, targetId)) return true;
    }
  }
  return false;
}

// Helper: Find item by ID
function findItemById(tree: HttpTreeItem[], id: string): HttpTreeItem | null {
  for (const item of tree) {
    if (item.id === id) return item;
    if (item.type !== 'request') {
      const found = findItemById(item.items, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Find parent of an item
function findParentOfItem(
  tree: HttpFolderItem[],
  id: string
): { parent: HttpFolderItem | null; index: number } | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      return { parent: null, index: i };
    }
  }
  for (const folder of tree) {
    const res = findInFolder(folder, id);
    if (res) return res;
  }
  function findInFolder(
    parent: HttpFolderItem,
    targetId: string
  ): { parent: HttpFolderItem; index: number } | null {
    for (let i = 0; i < parent.items.length; i++) {
      if (parent.items[i].id === targetId) {
        return { parent, index: i };
      }
      const child = parent.items[i];
      if (child.type !== 'request') {
        const nested = findInFolder(child, targetId);
        if (nested) return nested;
      }
    }
    return null;
  }
  return null;
}

// Helper: Migrate old format data if needed
function normalizeCollections(data: any): HttpFolderItem[] {
  if (!Array.isArray(data)) return [];
  return data.map((col: any) => {
    if (col.type === 'collection' || col.type === 'folder') {
      return {
        ...col,
        isOpen: col.isOpen !== false,
        items: Array.isArray(col.items) ? normalizeItems(col.items) : [],
      };
    }
    // Old format: { id, name, requests: [] }
    return {
      id: col.id || 'col-' + Date.now(),
      type: 'collection',
      name: col.name || 'Untitled Collection',
      isOpen: true,
      items: Array.isArray(col.requests)
        ? col.requests.map((r: any) => ({ ...r, type: 'request' }))
        : [],
    };
  });
}

function normalizeItems(items: any[]): (HttpFolderItem | HttpRequestItem)[] {
  return items.map((item) => {
    if (item.type === 'collection' || item.type === 'folder') {
      return {
        ...item,
        isOpen: item.isOpen !== false,
        items: Array.isArray(item.items) ? normalizeItems(item.items) : [],
      };
    }
    return {
      ...item,
      type: 'request',
    };
  });
}

interface HttpClientWorkspaceProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const HttpClientWorkspace: React.FC<HttpClientWorkspaceProps> = ({ showToast }) => {
  // Collections State
  const [collections, setCollections] = useState<HttpFolderItem[]>(() => {
    try {
      const saved = localStorage.getItem('octa_http_collections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeCollections(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse collections from localStorage', e);
    }
    return [];
  });

  // Active Request State
  const [activeRequest, setActiveRequest] = useState<HttpRequestItem>(() => {
    const first = findFirstRequest(collections);
    return first || createDefaultRequest();
  });

  const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body'>('params');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  // In-place Editing / Naming State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Context Menu State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    id: string;
    position: 'inside' | 'before' | 'after';
  } | null>(null);

  // Response State
  const [responseState, setResponseState] = useState<HttpResponseState | null>(null);

  // Load from Go backend on startup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const diskData = await loadHttpClientData();
        if (diskData && diskData.trim() && isMounted) {
          const parsed = JSON.parse(diskData);
          if (Array.isArray(parsed)) {
            const normalized = normalizeCollections(parsed);
            setCollections(normalized);
            const first = findFirstRequest(normalized);
            if (first) {
              setActiveRequest(first);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load HTTP client data from backend disk file:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save to Go backend and localStorage on tree change
  const saveTreeData = useCallback((nextTree: HttpFolderItem[]) => {
    setCollections(nextTree);
    try {
      const jsonStr = JSON.stringify(nextTree);
      localStorage.setItem('octa_http_collections', jsonStr);
      saveHttpClientData(jsonStr).catch((err) => {
        console.warn('Backend saveHttpClientData failed:', err);
      });
    } catch (e) {
      console.warn('Failed to persist collections:', e);
    }
  }, []);

  // Auto-focus and select all text when editing an item name
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update active request fields and sync into tree
  const updateActiveRequest = (updated: HttpRequestItem) => {
    setActiveRequest(updated);
    const updateRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items.map((item) => {
        if (item.id === updated.id && item.type === 'request') {
          return updated;
        }
        if (item.type !== 'request') {
          return {
            ...item,
            items: updateRecursively(item.items),
          };
        }
        return item;
      });
    };
    saveTreeData(updateRecursively(collections) as HttpFolderItem[]);
  };

  // Toggle folder / collection expanded state
  const toggleFolderOpen = (folderId: string) => {
    const toggleRecursively = (items: HttpFolderItem[]): HttpFolderItem[] => {
      return items.map((col) => {
        if (col.id === folderId) {
          return { ...col, isOpen: !col.isOpen };
        }
        return {
          ...col,
          items: col.items.map((child) => {
            if (child.type !== 'request') {
              return toggleRecursively([child])[0];
            }
            return child;
          }),
        };
      });
    };
    saveTreeData(toggleRecursively(collections));
  };

  // Commit in-place name change
  const commitNameEdit = () => {
    if (!editingId) return;
    const finalName = editingName.trim();
    if (!finalName) {
      setEditingId(null);
      return;
    }

    const renameRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items.map((item) => {
        if (item.id === editingId) {
          return { ...item, name: finalName };
        }
        if (item.type !== 'request') {
          return {
            ...item,
            items: renameRecursively(item.items),
          };
        }
        return item;
      });
    };

    saveTreeData(renameRecursively(collections) as HttpFolderItem[]);
    if (activeRequest.id === editingId) {
      setActiveRequest((prev) => ({ ...prev, name: finalName }));
    }
    setEditingId(null);
  };

  // 1. Create New Top-Level Collection
  const handleCreateNewCollection = () => {
    const newCol = createDefaultCollection('Untitled Collection');
    const next = [...collections, newCol];
    saveTreeData(next);
    setEditingId(newCol.id);
    setEditingName(newCol.name);
    setMenuOpenId(null);
    showToast('Created new collection', 'success');
  };

  // 2. Create Folder inside target parent (or root if null)
  const handleCreateFolder = (parentId: string | null) => {
    const newFolder = createDefaultFolder('New Folder');
    if (!parentId || collections.length === 0) {
      const newCol = createDefaultCollection('Untitled Collection');
      newCol.items.push(newFolder);
      saveTreeData([...collections, newCol]);
      setEditingId(newFolder.id);
      setEditingName(newFolder.name);
      setMenuOpenId(null);
      return;
    }

    const insertRecursively = (items: HttpFolderItem[]): HttpFolderItem[] => {
      return items.map((folder) => {
        if (folder.id === parentId) {
          return {
            ...folder,
            isOpen: true,
            items: [...folder.items, newFolder],
          };
        }
        return {
          ...folder,
          items: folder.items.map((child) => {
            if (child.type !== 'request') {
              return insertRecursively([child])[0];
            }
            return child;
          }),
        };
      });
    };

    saveTreeData(insertRecursively(collections));
    setEditingId(newFolder.id);
    setEditingName(newFolder.name);
    setMenuOpenId(null);
    showToast('Created new folder', 'info');
  };

  // 3. Create Request inside target parent (or root collection)
  const handleCreateNewRequest = (parentId?: string | null) => {
    const newReq = createDefaultRequest('Untitled Request');
    if (collections.length === 0) {
      const newCol = createDefaultCollection('My Collection');
      newCol.items.push(newReq);
      saveTreeData([newCol]);
      setActiveRequest(newReq);
      setEditingId(newReq.id);
      setEditingName(newReq.name);
      setResponseState(null);
      return;
    }

    const targetParentId = parentId || collections[0].id;
    const insertRecursively = (items: HttpFolderItem[]): HttpFolderItem[] => {
      return items.map((folder) => {
        if (folder.id === targetParentId) {
          return {
            ...folder,
            isOpen: true,
            items: [newReq, ...folder.items],
          };
        }
        return {
          ...folder,
          items: folder.items.map((child) => {
            if (child.type !== 'request') {
              return insertRecursively([child])[0];
            }
            return child;
          }),
        };
      });
    };

    saveTreeData(insertRecursively(collections));
    setActiveRequest(newReq);
    setEditingId(newReq.id);
    setEditingName(newReq.name);
    setResponseState(null);
    setMenuOpenId(null);
    showToast('Created new request', 'info');
  };

  // 4. Duplicate Request
  const handleDuplicateRequest = (reqId: string) => {
    const original = findItemById(collections, reqId) as HttpRequestItem;
    if (!original || original.type !== 'request') return;

    const duplicated: HttpRequestItem = {
      ...original,
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: original.name + ' (Copy)',
    };

    const duplicateInTree = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      const next: (HttpFolderItem | HttpRequestItem)[] = [];
      for (const item of items) {
        next.push(item);
        if (item.id === reqId) {
          next.push(duplicated);
        } else if (item.type !== 'request') {
          item.items = duplicateInTree(item.items);
        }
      }
      return next;
    };

    saveTreeData(duplicateInTree(collections) as HttpFolderItem[]);
    setActiveRequest(duplicated);
    setMenuOpenId(null);
    showToast('Request duplicated', 'success');
  };

  // 5. Delete Item (Collection, Folder, or Request)
  const handleDeleteItem = (id: string) => {
    const deleteRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.type !== 'request') {
            return {
              ...item,
              items: deleteRecursively(item.items),
            };
          }
          return item;
        });
    };

    const nextTree = deleteRecursively(collections) as HttpFolderItem[];
    saveTreeData(nextTree);
    if (activeRequest.id === id) {
      const first = findFirstRequest(nextTree);
      setActiveRequest(first || createDefaultRequest());
      setResponseState(null);
    }
    setMenuOpenId(null);
    showToast('Deleted successfully', 'info');
  };

  // 6. Tree Drag & Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: HttpTreeItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || draggedId === targetItem.id) return;
    if (isDescendant(collections, draggedId, targetItem.id)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'inside' | 'after' = 'inside';

    if (targetItem.type === 'request') {
      position = offsetY < height / 2 ? 'before' : 'after';
    } else {
      if (offsetY < height * 0.25) {
        position = 'before';
      } else if (offsetY > height * 0.75) {
        position = 'after';
      } else {
        position = 'inside';
      }
    }

    setDragOverTarget({ id: targetItem.id, position });
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    if (dragOverTarget?.id === id) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetItem: HttpTreeItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || draggedId === targetItem.id || !dragOverTarget) {
      setDraggedId(null);
      setDragOverTarget(null);
      return;
    }

    if (isDescendant(collections, draggedId, targetItem.id)) {
      setDraggedId(null);
      setDragOverTarget(null);
      return;
    }

    // 1. Extract dragged item from tree
    const extractedItem = findItemById(collections, draggedId);
    if (!extractedItem) return;

    const removeDragged = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items
        .filter((item) => item.id !== draggedId)
        .map((item) => {
          if (item.type !== 'request') {
            return {
              ...item,
              items: removeDragged(item.items),
            };
          }
          return item;
        });
    };

    const treeWithoutDragged = removeDragged(collections) as HttpFolderItem[];

    // 2. Insert into new location
    const { position } = dragOverTarget;

    if (position === 'inside' && targetItem.type !== 'request') {
      // Drop inside folder/collection
      const insertInside = (items: HttpFolderItem[]): HttpFolderItem[] => {
        return items.map((folder) => {
          if (folder.id === targetItem.id) {
            return {
              ...folder,
              isOpen: true,
              items: [...folder.items, extractedItem],
            };
          }
          return {
            ...folder,
            items: folder.items.map((child) => {
              if (child.type !== 'request') {
                return insertInside([child])[0];
              }
              return child;
            }),
          };
        });
      };
      saveTreeData(insertInside(treeWithoutDragged));
    } else {
      // Insert before or after targetItem
      const parentInfo = findParentOfItem(treeWithoutDragged, targetItem.id);
      if (!parentInfo) {
        // Target is at top-level collections
        const targetIdx = treeWithoutDragged.findIndex((c) => c.id === targetItem.id);
        const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
        const newCols = [...treeWithoutDragged];
        newCols.splice(insertIdx, 0, extractedItem as HttpFolderItem);
        saveTreeData(newCols);
      } else {
        const { parent, index } = parentInfo;
        const insertIdx = position === 'before' ? index : index + 1;

        if (parent === null) {
          const newCols = [...treeWithoutDragged];
          newCols.splice(insertIdx, 0, extractedItem as HttpFolderItem);
          saveTreeData(newCols);
        } else {
          const insertInParent = (items: HttpFolderItem[]): HttpFolderItem[] => {
            return items.map((folder) => {
              if (folder.id === parent.id) {
                const newItems = [...folder.items];
                newItems.splice(insertIdx, 0, extractedItem);
                return {
                  ...folder,
                  items: newItems,
                };
              }
              return {
                ...folder,
                items: folder.items.map((child) => {
                  if (child.type !== 'request') {
                    return insertInParent([child])[0];
                  }
                  return child;
                }),
              };
            });
          };
          saveTreeData(insertInParent(treeWithoutDragged));
        }
      }
    }

    setDraggedId(null);
    setDragOverTarget(null);
  };

  // Handle Send Request Execution
  const handleSendRequest = async () => {
    if (!activeRequest.url.trim()) {
      showToast('Please enter a request URL', 'error');
      return;
    }

    setIsSending(true);
    const startTs = Date.now();
    try {
      let targetUrl = activeRequest.url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const enabledParams = activeRequest.params.filter((p) => p.enabled && p.key);
      if (enabledParams.length > 0) {
        const queryStr = enabledParams
          .map((p) => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value))
          .join('&');
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryStr;
      }

      const reqHeaders: Record<string, string> = {};
      activeRequest.headers.forEach((h) => {
        if (h.enabled && h.key) reqHeaders[h.key] = h.value;
      });

      const options: RequestInit = {
        method: activeRequest.method,
        headers: reqHeaders,
      };

      if (activeRequest.method !== 'GET' && activeRequest.bodyContent && activeRequest.bodyType !== 'none') {
        options.body = activeRequest.bodyContent;
      }

      const res = await fetch(targetUrl, options);
      const durationMs = Date.now() - startTs;
      const text = await res.text();
      let jsonData: any = null;
      try {
        jsonData = JSON.parse(text);
      } catch {
        jsonData = text;
      }

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      setResponseState({
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        durationMs,
        sizeKb: Number((text.length / 1024).toFixed(2)),
        data: jsonData,
        headers: resHeaders,
      });

      showToast('Response: ' + res.status + ' ' + (res.statusText || ''), res.ok ? 'success' : 'error');
    } catch (err: any) {
      const durationMs = Date.now() - startTs;
      setResponseState({
        status: 0,
        statusText: 'Network Error',
        durationMs,
        sizeKb: 0,
        data: { error: err?.message || String(err), hint: 'Check target URL, network connection, or CORS permissions' },
        headers: {},
      });
      showToast('Request failed: ' + (err?.message || err), 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Filter matches helper
  const matchesSearch = (item: HttpTreeItem): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (item.name.toLowerCase().includes(q)) return true;
    if (item.type === 'request' && item.url.toLowerCase().includes(q)) return true;
    if (item.type !== 'request') {
      return item.items.some((child) => matchesSearch(child));
    }
    return false;
  };

  // Recursive Tree Item Renderer
  const renderTreeItem = (item: HttpTreeItem, depth: number = 0) => {
    if (!matchesSearch(item)) return null;

    const isFolder = item.type === 'collection' || item.type === 'folder';
    const isCollection = item.type === 'collection';
    const isSelected = !isFolder && activeRequest.id === item.id;
    const isEditing = editingId === item.id;
    const isMenuOpen = menuOpenId === item.id;

    // Drag over state styling
    const isDragTarget = dragOverTarget?.id === item.id;
    const dropPosition = isDragTarget ? dragOverTarget.position : null;

    return (
      <div key={item.id} className="relative select-none">
        {/* Drop Line: Before */}
        {dropPosition === 'before' && (
          <div className="h-0.5 w-full bg-brand-400 my-0.5 rounded shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        )}

        {/* Item Row */}
        <div
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item)}
          onDragLeave={(e) => handleDragLeave(e, item.id)}
          onDrop={(e) => handleDrop(e, item)}
          onClick={() => {
            if (isFolder) {
              toggleFolderOpen(item.id);
            } else {
              setActiveRequest(item as HttpRequestItem);
              setResponseState(null);
            }
          }}
          style={{ paddingLeft: depth * 14 + 8 }}
          className={
            'w-full pr-2 py-1.5 rounded-lg flex items-center gap-1.5 text-left transition-all cursor-pointer group/row ' +
            (isSelected
              ? 'bg-surface-800 text-white font-medium shadow-sm border-l-2 border-brand-400'
              : 'text-zinc-300 hover:text-zinc-100 hover:bg-[#1a1a1a]') +
            (dropPosition === 'inside'
              ? ' ring-1 ring-brand-400 bg-brand-500/10 border-brand-500/50'
              : '')
          }
        >
          {/* Chevron / Toggle for Folders & Collections */}
          {isFolder ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderOpen(item.id);
              }}
              className="p-0.5 text-zinc-500 hover:text-zinc-300 rounded cursor-pointer"
            >
              {item.isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
          ) : (
            <span className="w-3.5" />
          )}

          {/* Type Icon */}
          {isCollection ? (
            <Layers className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          ) : isFolder ? (
            item.isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400/90 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
            )
          ) : (
            <span
              className={
                'text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border flex-shrink-0 ' +
                (METHOD_COLORS[(item as HttpRequestItem).method]?.badge || METHOD_COLORS.GET.badge)
              }
            >
              {(item as HttpRequestItem).method}
            </span>
          )}

          {/* Name or In-Place Input */}
          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitNameEdit();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center gap-1 min-w-0"
            >
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitNameEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full px-1.5 py-0.5 text-xs font-medium bg-[#222222] border border-brand-500 rounded text-white outline-none"
              />
            </form>
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId(item.id);
                setEditingName(item.name);
              }}
              className={'text-xs truncate flex-1 ' + (isCollection ? 'font-semibold text-zinc-200' : isFolder ? 'font-medium text-zinc-300' : 'text-zinc-400 group-hover/row:text-zinc-200')}
            >
              {item.name}
            </span>
          )}

          {/* Request Count Badge for Collections / Folders */}
          {isFolder && !isEditing && (
            <span className="text-[10px] text-zinc-600 font-mono pr-1">
              {countRequests(item)}
            </span>
          )}

          {/* 3-Dot Action Menu Button */}
          {!isEditing && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(isMenuOpen ? null : item.id);
                }}
                title="Options"
                className="opacity-0 group-hover/row:opacity-100 p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-all cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Context / 3-Dot Dropdown Menu */}
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-44 bg-[#181818] border border-[#2b2b2b] rounded-lg shadow-2xl py-1 z-50 text-xs text-zinc-300 backdrop-blur-md"
                >
                  {isFolder ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCreateNewRequest(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-brand-400" />
                        <span>Add Request</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateFolder(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add Folder</span>
                      </button>
                      <div className="h-px bg-[#262626] my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                          setMenuOpenId(null);
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Rename</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDuplicateRequest(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Files className="w-3.5 h-3.5 text-brand-400" />
                        <span>Duplicate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                          setMenuOpenId(null);
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Rename</span>
                      </button>
                      <div className="h-px bg-[#262626] my-1" />
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drop Line: After */}
        {dropPosition === 'after' && (
          <div className="h-0.5 w-full bg-brand-400 my-0.5 rounded shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        )}

        {/* Render Children for Open Folders */}
        {isFolder && item.isOpen && item.items.length > 0 && (
          <div className="space-y-0.5">
            {item.items.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}

        {/* Render Empty State for Empty Open Folders */}
        {isFolder && item.isOpen && item.items.length === 0 && (
          <div
            style={{ paddingLeft: (depth + 1) * 14 + 12 }}
            className="py-1 text-[11px] text-zinc-600 italic select-none"
          >
            Empty folder
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex h-full bg-[#121212] text-zinc-100 overflow-hidden select-none font-sans">
      {/* 1. Request Explorer Tree Sidebar */}
      <div className="w-68 border-r border-[#262626] bg-[#161616] flex flex-col flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Explorer</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCreateNewCollection}
              title="New Collection"
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-400 hover:text-zinc-200 border border-[#2b2b2b] transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleCreateNewRequest()}
              title="New HTTP Request"
              className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        {collections.length > 0 && (
          <div className="px-3 py-2 border-b border-[#262626]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter requests & folders..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded-md text-zinc-200 placeholder-zinc-500 focus:border-brand-500 outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Tree View Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {collections.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center select-none text-zinc-500">
              <div className="w-10 h-10 rounded-xl bg-surface-800 border border-[#2b2b2b] flex items-center justify-center mb-3 text-zinc-400">
                <FolderPlus className="w-5 h-5 text-zinc-400" />
              </div>
              <span className="text-xs font-semibold text-zinc-300">No Collections</span>
              <span className="text-[11px] text-zinc-500 mt-1 mb-4 leading-normal">
                Create a collection to organize and save your API endpoints in folders.
              </span>
              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleCreateNewRequest()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Request</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewCollection}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-300 hover:text-white border border-[#2b2b2b] text-xs transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>New Collection</span>
                </button>
              </div>
            </div>
          ) : (
            collections.map((col) => renderTreeItem(col, 0))
          )}
        </div>
      </div>

      {/* 2. Main Request & Response Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121212]">
        {/* Top Request Title & URL Bar */}
        <div className="p-3 border-b border-[#262626] bg-[#171717] flex flex-col gap-2 flex-shrink-0">
          {/* Request Name Header */}
          <div className="flex items-center gap-2">
            {editingId === activeRequest.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitNameEdit();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitNameEdit}
                  className="px-2 py-0.5 text-xs font-semibold bg-[#1f1f1f] border border-cyan-500 rounded text-white outline-none"
                />
              </form>
            ) : (
              <div
                onClick={() => {
                  setEditingId(activeRequest.id);
                  setEditingName(activeRequest.name);
                }}
                title="Click to rename request"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white cursor-pointer group"
              >
                <span>{activeRequest.name}</span>
                <Edit2 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* URL Input & Method Bar */}
          <div className="flex items-center gap-2">
            {/* Method Dropdown */}
            <select
              value={activeRequest.method}
              onChange={(e) => updateActiveRequest({ ...activeRequest, method: e.target.value as any })}
              className={'px-3 py-1.5 text-xs font-mono font-bold rounded-lg border bg-[#1c1c1c] outline-none cursor-pointer ' + (METHOD_COLORS[activeRequest.method]?.badge || '')}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            {/* URL Input */}
            <input
              type="text"
              value={activeRequest.url}
              onChange={(e) => updateActiveRequest({ ...activeRequest, url: e.target.value })}
              placeholder="https://api.example.com/v1/resource"
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-[#1a1a1a] border border-[#2b2b2b] rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-brand-500 outline-none"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={isSending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Middle Section: Request Details & Response Inspector */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left / Top: Request Builder */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[#262626] overflow-hidden">
            {/* Request Tabs Header */}
            <div className="px-3 border-b border-[#262626] bg-[#161616] flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setRequestTab('params')}
                className={'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' + (requestTab === 'params' ? 'border-brand-400 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200')}
              >
                Params ({activeRequest.params.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestTab('headers')}
                className={'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' + (requestTab === 'headers' ? 'border-brand-400 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200')}
              >
                Headers ({activeRequest.headers.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestTab('body')}
                className={'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' + (requestTab === 'body' ? 'border-brand-400 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200')}
              >
                Body
              </button>
            </div>

            {/* Request Tab Content */}
            <div className="flex-1 p-3 overflow-y-auto bg-[#141414]">
              {requestTab === 'params' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Query Parameters
                  </div>
                  {activeRequest.params.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => {
                          const next = [...activeRequest.params];
                          next[idx].enabled = e.target.checked;
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        className="rounded bg-zinc-800 border-zinc-700 text-brand-500"
                      />
                      <input
                        type="text"
                        value={p.key}
                        onChange={(e) => {
                          const next = [...activeRequest.params];
                          next[idx].key = e.target.value;
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        placeholder="Key"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <input
                        type="text"
                        value={p.value}
                        onChange={(e) => {
                          const next = [...activeRequest.params];
                          next[idx].value = e.target.value;
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        placeholder="Value"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeRequest.params.filter((_, i) => i !== idx);
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        title="Remove Parameter"
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveRequest({
                        ...activeRequest,
                        params: [...activeRequest.params, { key: '', value: '', enabled: true }],
                      });
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Parameter</span>
                  </button>
                </div>
              )}

              {requestTab === 'headers' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Headers</div>
                  {activeRequest.headers.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => {
                          const next = [...activeRequest.headers];
                          next[idx].enabled = e.target.checked;
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        className="rounded bg-zinc-800 border-zinc-700 text-brand-500"
                      />
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => {
                          const next = [...activeRequest.headers];
                          next[idx].key = e.target.value;
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        placeholder="Header Name"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => {
                          const next = [...activeRequest.headers];
                          next[idx].value = e.target.value;
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        placeholder="Value"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeRequest.headers.filter((_, i) => i !== idx);
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        title="Remove Header"
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveRequest({
                        ...activeRequest,
                        headers: [...activeRequest.headers, { key: '', value: '', enabled: true }],
                      });
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Header</span>
                  </button>
                </div>
              )}

              {requestTab === 'body' && (
                <div className="h-full flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      JSON Body
                    </span>
                  </div>
                  <textarea
                    value={activeRequest.bodyContent}
                    onChange={(e) =>
                      updateActiveRequest({ ...activeRequest, bodyContent: e.target.value, bodyType: 'json' })
                    }
                    placeholder="Enter raw JSON body..."
                    rows={12}
                    className="w-full flex-1 p-3 text-xs font-mono bg-[#161616] border border-[#2b2b2b] rounded-lg text-zinc-200 outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right / Bottom: Response Inspector */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#151515]">
            {/* Response Status Bar */}
            <div className="px-3 py-2 border-b border-[#262626] bg-[#181818] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Response</span>
                {responseState && (
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'text-xs font-mono font-bold px-2 py-0.5 rounded border ' +
                        (responseState.status >= 200 && responseState.status < 300
                          ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/70 border-rose-500/40 text-rose-300')
                      }
                    >
                      {responseState.status} {responseState.statusText}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{responseState.durationMs} ms</span>
                    <span className="text-xs font-mono text-zinc-500">•</span>
                    <span className="text-xs font-mono text-zinc-400">{responseState.sizeKb} KB</span>
                  </div>
                )}
              </div>

              {responseState && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      typeof responseState.data === 'object'
                        ? JSON.stringify(responseState.data, null, 2)
                        : String(responseState.data)
                    );
                    showToast('Response copied to clipboard', 'success');
                  }}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#202020] border border-zinc-700/60 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {/* Response Body Inspector */}
            <div className="flex-1 overflow-auto p-3 bg-[#131313]">
              {responseState ? (
                <pre className="text-xs font-mono text-zinc-200 whitespace-pre leading-relaxed select-text">
                  {typeof responseState.data === 'object'
                    ? JSON.stringify(responseState.data, null, 2)
                    : responseState.data}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none text-zinc-500">
                  <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#2b2b2b] flex items-center justify-center mb-3 text-zinc-400">
                    <Send className="w-5 h-5 text-brand-400 opacity-80" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300">No response yet</span>
                  <span className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-normal">
                    Enter a URL and click <strong className="text-brand-400">Send</strong> to execute the request and view response data, headers, and status metrics.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
