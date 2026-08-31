import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
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
  X,
  Check,
  Columns2,
  Rows2
} from 'lucide-react';
import interfaceSvg from '../assets/interface.svg';
import { saveHttpClientData, loadHttpClientData } from '../services/api';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

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
  method: HttpMethod;
  url: string;
  headers: HttpHeader[];
  params: HttpParam[];
  bodyType: 'json' | 'raw' | 'none';
  bodyContent: string;
  isDirty?: boolean;
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

export const HTTP_METHODS: { method: HttpMethod; label: string; color: string; badge: string }[] = [
  { method: 'GET', label: 'GET', color: 'text-emerald-400', badge: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' },
  { method: 'POST', label: 'POST', color: 'text-amber-400', badge: 'bg-amber-950/70 border-amber-500/40 text-amber-300' },
  { method: 'PUT', label: 'PUT', color: 'text-blue-400', badge: 'bg-blue-950/70 border-blue-500/40 text-blue-300' },
  { method: 'PATCH', label: 'PATCH', color: 'text-purple-400', badge: 'bg-purple-950/70 border-purple-500/40 text-purple-300' },
  { method: 'DELETE', label: 'DELETE', color: 'text-rose-400', badge: 'bg-rose-950/70 border-rose-500/40 text-rose-300' },
  { method: 'OPTIONS', label: 'OPTIONS', color: 'text-zinc-400', badge: 'bg-zinc-900 border-zinc-700 text-zinc-300' },
  { method: 'HEAD', label: 'HEAD', color: 'text-sky-400', badge: 'bg-sky-950/70 border-sky-500/40 text-sky-300' },
];

export const METHOD_COLORS: Record<string, { badge: string; text: string }> = HTTP_METHODS.reduce((acc, curr) => {
  acc[curr.method] = { badge: curr.badge, text: curr.color };
  return acc;
}, {} as Record<string, { badge: string; text: string }>);

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
  isDirty: false,
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

// Helper: Normalize collections
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

// --- Custom Method Dropdown Component ---
interface HttpMethodDropdownProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

const HttpMethodDropdown: React.FC<HttpMethodDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = HTTP_METHODS.find((m) => m.method === value) || HTTP_METHODS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        const idx = HTTP_METHODS.findIndex((m) => m.method === value);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % HTTP_METHODS.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + HTTP_METHODS.length) % HTTP_METHODS.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(HTTP_METHODS[focusedIndex].method);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative select-none flex-shrink-0">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer bg-[#1a1a1c] hover:bg-[#222226] border-zinc-700/80 shadow-sm outline-none focus:border-brand-500 ' +
          selectedOption.color
        }
      >
        <span>{selectedOption.method}</span>
        <ChevronDown
          className={'w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ' + (isOpen ? 'rotate-180' : '')}
        />
      </button>

      {/* Floating Menu List */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-40 bg-[#161618] border border-zinc-800/90 shadow-2xl rounded-xl py-1.5 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/60 mb-1">
            HTTP Method
          </div>
          {HTTP_METHODS.map((item, index) => {
            const isSelected = item.method === value;
            const isFocused = index === focusedIndex;
            return (
              <button
                key={item.method}
                type="button"
                onClick={() => {
                  onChange(item.method);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={
                  'w-full px-2.5 py-1.5 flex items-center justify-between text-xs font-mono transition-colors cursor-pointer ' +
                  (isFocused ? 'bg-zinc-800/80 text-white' : 'text-zinc-300 hover:bg-zinc-800/50')
                }
              >
                <div className="flex items-center gap-2">
                  <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold border ' + item.badge}>
                    {item.method}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface HttpClientWorkspaceProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const HttpClientWorkspace: React.FC<HttpClientWorkspaceProps> = ({ showToast }) => {
  // Collections Tree State
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

  // Multi-Tab State (starts empty if no saved tabs exist)
  const [openTabs, setOpenTabs] = useState<HttpRequestItem[]>(() => {
    try {
      const savedTabs = localStorage.getItem('octa_http_open_tabs');
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('octa_http_active_tab_id');
    if (savedActiveId && openTabs.some((t) => t.id === savedActiveId)) {
      return savedActiveId;
    }
    return openTabs[0]?.id || '';
  });

  // Get active request from active tab (null if no tabs open)
  const activeRequest: HttpRequestItem | null =
    openTabs.find((t) => t.id === activeTabId) || (openTabs.length > 0 ? openTabs[0] : null);

  // Layout Orientation State: 'horizontal' (side-by-side) vs 'vertical' (stacked)
  const [layoutOrientation, setLayoutOrientation] = useState<'horizontal' | 'vertical'>(() => {
    const saved = localStorage.getItem('octa_http_layout_orientation');
    return saved === 'vertical' ? 'vertical' : 'horizontal';
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

  // Response State (mapped per request tab id)
  const [responseMap, setResponseMap] = useState<Record<string, HttpResponseState>>({});
  const activeResponseState = activeRequest ? responseMap[activeRequest.id] || null : null;

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

  // Persist open tabs and layout orientation
  useEffect(() => {
    try {
      localStorage.setItem('octa_http_open_tabs', JSON.stringify(openTabs));
      localStorage.setItem('octa_http_active_tab_id', activeTabId);
      localStorage.setItem('octa_http_layout_orientation', layoutOrientation);
    } catch (e) {
      console.warn('Failed to persist tabs state:', e);
    }
  }, [openTabs, activeTabId, layoutOrientation]);

  // Save tree data to Go backend and localStorage
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

  // Update active request in open tabs and sync into tree
  const updateActiveRequest = (updated: HttpRequestItem) => {
    // 1. Update open tabs
    const nextTabs = openTabs.map((t) => (t.id === updated.id ? { ...updated, isDirty: true } : t));
    setOpenTabs(nextTabs);

    // 2. Sync to collection tree
    const updateRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items.map((item) => {
        if (item.id === updated.id && item.type === 'request') {
          return { ...updated, isDirty: true };
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

  // Select / Open a request in tabs
  const handleOpenRequestInTab = (req: HttpRequestItem) => {
    const exists = openTabs.find((t) => t.id === req.id);
    if (!exists) {
      setOpenTabs((prev) => [...prev, req]);
    }
    setActiveTabId(req.id);
  };

  // Close a tab (Refactored: Does NOT spawn a default tab when closing the last one)
  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const idx = openTabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    const nextTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(nextTabs);

    if (nextTabs.length === 0) {
      setActiveTabId('');
    } else if (activeTabId === tabId) {
      const nextActive = nextTabs[Math.max(0, idx - 1)];
      setActiveTabId(nextActive.id);
    }
  };

  // Create new tab directly from tab strip
  const handleNewTab = () => {
    const newReq = createDefaultRequest('Untitled Request');
    if (collections.length > 0) {
      // Add to first collection
      const nextCols = [
        {
          ...collections[0],
          items: [newReq, ...collections[0].items],
        },
        ...collections.slice(1),
      ];
      saveTreeData(nextCols);
    }
    setOpenTabs((prev) => [...prev, newReq]);
    setActiveTabId(newReq.id);
    setEditingId(newReq.id);
    setEditingName(newReq.name);
    showToast('New request tab opened', 'info');
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
    // Update open tabs title as well
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, name: finalName } : t))
    );
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

  // 2. Create Folder inside target parent
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

  // 3. Create Request inside target parent
  const handleCreateNewRequest = (parentId?: string | null) => {
    const newReq = createDefaultRequest('Untitled Request');
    if (collections.length === 0) {
      const newCol = createDefaultCollection('My Collection');
      newCol.items.push(newReq);
      saveTreeData([newCol]);
      setOpenTabs([newReq]);
      setActiveTabId(newReq.id);
      setEditingId(newReq.id);
      setEditingName(newReq.name);
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
    handleOpenRequestInTab(newReq);
    setEditingId(newReq.id);
    setEditingName(newReq.name);
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
      isDirty: false,
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
    handleOpenRequestInTab(duplicated);
    setMenuOpenId(null);
    showToast('Request duplicated', 'success');
  };

  // 5. Delete Item
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

    // If deleted item was open in tabs, close it
    if (openTabs.some((t) => t.id === id)) {
      handleCloseTab(id);
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
    const { position } = dragOverTarget;

    if (position === 'inside' && targetItem.type !== 'request') {
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
      const parentInfo = findParentOfItem(treeWithoutDragged, targetItem.id);
      if (!parentInfo) {
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

  // Send HTTP Request
  const handleSendRequest = async () => {
    if (!activeRequest) return;
    if (!activeRequest.url.trim()) {
      showToast('Please enter a request URL', 'error');
      return;
    }

    setIsSending(true);
    const startTs = Date.now();
    const reqId = activeRequest.id;

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

      if (activeRequest.method !== 'GET' && activeRequest.method !== 'HEAD' && activeRequest.bodyContent && activeRequest.bodyType !== 'none') {
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

      const result: HttpResponseState = {
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        durationMs,
        sizeKb: Number((text.length / 1024).toFixed(2)),
        data: jsonData,
        headers: resHeaders,
      };

      setResponseMap((prev) => ({ ...prev, [reqId]: result }));
      showToast('Response: ' + res.status + ' ' + (res.statusText || ''), res.ok ? 'success' : 'error');
    } catch (err: any) {
      const durationMs = Date.now() - startTs;
      const errorResult: HttpResponseState = {
        status: 0,
        statusText: 'Network Error',
        durationMs,
        sizeKb: 0,
        data: { error: err?.message || String(err), hint: 'Check target URL, network connection, or CORS permissions' },
        headers: {},
      };
      setResponseMap((prev) => ({ ...prev, [reqId]: errorResult }));
      showToast('Request failed: ' + (err?.message || err), 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard shortcut support (Ctrl+W, Ctrl+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          if (activeTabId) {
            handleCloseTab(activeTabId);
          }
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          handleNewTab();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, openTabs]);

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
    const isSelected = !isFolder && activeRequest?.id === item.id;
    const isEditing = editingId === item.id;
    const isMenuOpen = menuOpenId === item.id;

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
              handleOpenRequestInTab(item as HttpRequestItem);
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
              className={
                'text-xs truncate flex-1 ' +
                (isCollection
                  ? 'font-semibold text-zinc-200'
                  : isFolder
                  ? 'font-medium text-zinc-300'
                  : 'text-zinc-400 group-hover/row:text-zinc-200')
              }
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
    <div className="flex-1 flex h-full bg-[#121214] text-zinc-100 overflow-hidden select-none font-sans">
      {/* Resizable Panel Group (Level 1: Sidebar vs Main Workspace) */}
      <Group orientation="horizontal" id="octa_http_main_split" className="h-full w-full">
        {/* 1. Request Explorer Tree Sidebar */}
        <Panel defaultSize="22%" minSize="14%" maxSize="40%" className="flex flex-col h-full bg-[#161618] border-r border-[#26262a]">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-[#26262a] flex items-center justify-between">
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
            <div className="px-3 py-2 border-b border-[#26262a]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter requests & folders..."
                  className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#1a1a1c] border border-[#2b2b2e] rounded-md text-zinc-200 placeholder-zinc-500 focus:border-brand-500 outline-none font-mono"
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
        </Panel>

        {/* Resize Handle 1 (Sidebar vs Workspace) */}
        <Separator className="w-1 bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-col-resize relative flex items-center justify-center group/h1">
          <div className="w-0.5 h-8 bg-zinc-600 rounded-full group-hover/h1:bg-brand-300 transition-colors" />
        </Separator>

        {/* 2. Main API Workspace Panel */}
        <Panel defaultSize="78%" minSize="40%" className="flex flex-col h-full overflow-hidden bg-[#121214]">
          {/* Top Multi-Tab Bar Strip */}
          <div className="bg-[#141416] border-b border-[#242428] flex items-center justify-between pl-2 pr-3 flex-shrink-0 select-none min-h-[38px]">
            {/* Scrollable Tabs List */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
              {openTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const methodColor = METHOD_COLORS[tab.method] || METHOD_COLORS.GET;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    onAuxClick={(e) => {
                      if (e.button === 1) handleCloseTab(tab.id, e);
                    }}
                    title={tab.name + ' (' + tab.method + ')'}
                    className={
                      'group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[200px] ' +
                      (isActive
                        ? 'bg-[#1e1e22] text-white border-zinc-700/80 shadow-sm font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181c] border-transparent')
                    }
                  >
                    {/* Method Tag */}
                    <span className={'text-[9px] font-bold font-mono px-1 py-0.2 rounded border ' + methodColor.badge}>
                      {tab.method}
                    </span>

                    {/* Tab Title */}
                    <span className="truncate flex-1">{tab.name}</span>

                    {/* Dirty Dot Indicator */}
                    {tab.isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                    )}

                    {/* Close Tab Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      title="Close Tab (Ctrl+W)"
                      className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Add Tab Button */}
              <button
                type="button"
                onClick={handleNewTab}
                title="New Request Tab (Ctrl+T)"
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layout Orientation Switcher (only when active request exists) */}
            {activeRequest && (
              <div className="flex items-center gap-1 pl-2 border-l border-zinc-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setLayoutOrientation(layoutOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                  title={
                    layoutOrientation === 'horizontal'
                      ? 'Switch to Stacked View (Top/Bottom)'
                      : 'Switch to Side-by-Side View (Left/Right)'
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800 transition-colors cursor-pointer"
                >
                  {layoutOrientation === 'horizontal' ? (
                    <>
                      <Columns2 className="w-3.5 h-3.5 text-brand-400" />
                      <span className="text-[11px] hidden sm:inline">Side-by-Side</span>
                    </>
                  ) : (
                    <>
                      <Rows2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] hidden sm:inline">Stacked</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Main Area: Empty Workspace Landing or Active Request Workspace */}
          {!activeRequest ? (
            <div className="flex-1 w-full h-full bg-[#121212] flex flex-col items-center justify-center select-none overflow-hidden p-8">
              {/* Central Geometric Watermark Matching Database Empty State */}
              <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] max-w-[50vw] max-h-[50vh] flex items-center justify-center pointer-events-none">
                <img
                  src={interfaceSvg}
                  className="w-full h-full object-contain opacity-45 select-none pointer-events-none drop-shadow-2xl"
                  alt="Empty Workspace"
                />
              </div>

              {/* Subtitle / Action */}
              <div className="mt-4 flex flex-col items-center text-center">
                <span className="text-sm font-semibold text-zinc-300">No Request Selected</span>
                <span className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Click a request in the explorer sidebar to open or click + to create a new tab.
                </span>
                <button
                  type="button"
                  onClick={handleNewTab}
                  className="mt-6 flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700/60 hover:border-zinc-600 rounded-lg shadow-sm transition-all duration-150 cursor-pointer group"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  <span>New Request</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Request Header Bar (Custom Method Dropdown + URL + Send Button) */}
              <div className="p-3 border-b border-[#242428] bg-[#161619] flex flex-col gap-2 flex-shrink-0">
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
                        className="px-2 py-0.5 text-xs font-semibold bg-[#1f1f23] border border-brand-500 rounded text-white outline-none"
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

                {/* URL Input & Custom Method Bar */}
                <div className="flex items-center gap-2">
                  {/* Custom HTTP Method Dropdown */}
                  <HttpMethodDropdown
                    value={activeRequest.method}
                    onChange={(newMethod) => updateActiveRequest({ ...activeRequest, method: newMethod })}
                  />

                  {/* URL Input */}
                  <input
                    type="text"
                    value={activeRequest.url}
                    onChange={(e) => updateActiveRequest({ ...activeRequest, url: e.target.value })}
                    placeholder="https://api.example.com/v1/resource"
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-[#1a1a1d] border border-[#2b2b30] rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-brand-500 outline-none"
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

              {/* Level 2 Resizable Panel Group (Request Builder vs Response Viewer) */}
              <div className="flex-1 overflow-hidden">
                <Group
                  key={layoutOrientation}
                  orientation={layoutOrientation}
                  id={'octa_http_workspace_' + layoutOrientation}
                  className="h-full w-full"
                >
                  {/* Left / Top: Request Builder Panel */}
                  <Panel defaultSize="50%" minSize="25%" className="flex flex-col h-full overflow-hidden bg-[#131316]">
                    {/* Request Tabs Header */}
                    <div className="px-3 border-b border-[#242428] bg-[#161619] flex items-center gap-1 text-xs flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setRequestTab('params')}
                        className={
                          'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' +
                          (requestTab === 'params'
                            ? 'border-brand-400 text-brand-300'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200')
                        }
                      >
                        Params ({activeRequest.params.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestTab('headers')}
                        className={
                          'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' +
                          (requestTab === 'headers'
                            ? 'border-brand-400 text-brand-300'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200')
                        }
                      >
                        Headers ({activeRequest.headers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestTab('body')}
                        className={
                          'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' +
                          (requestTab === 'body'
                            ? 'border-brand-400 text-brand-300'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200')
                        }
                      >
                        Body
                      </button>
                    </div>

                    {/* Request Tab Content */}
                    <div className="flex-1 p-3 overflow-y-auto bg-[#131316]">
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
                                className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1e] border border-[#2b2b30] rounded text-zinc-200 font-mono outline-none"
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
                                className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1e] border border-[#2b2b30] rounded text-zinc-200 font-mono outline-none"
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
                                className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1e] border border-[#2b2b30] rounded text-zinc-200 font-mono outline-none"
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
                                className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1e] border border-[#2b2b30] rounded text-zinc-200 font-mono outline-none"
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
                            className="w-full flex-1 p-3 text-xs font-mono bg-[#18181c] border border-[#2b2b30] rounded-lg text-zinc-200 outline-none resize-none"
                          />
                        </div>
                      )}
                    </div>
                  </Panel>

                  {/* Resize Handle 2 (Request vs Response) */}
                  <Separator
                    className={
                      layoutOrientation === 'horizontal'
                        ? 'w-1 bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-col-resize relative flex items-center justify-center group/h2'
                        : 'h-1 bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-row-resize relative flex items-center justify-center group/h2'
                    }
                  >
                    <div
                      className={
                        layoutOrientation === 'horizontal'
                          ? 'w-0.5 h-8 bg-zinc-600 rounded-full group-hover/h2:bg-brand-300 transition-colors'
                          : 'h-0.5 w-8 bg-zinc-600 rounded-full group-hover/h2:bg-brand-300 transition-colors'
                      }
                    />
                  </Separator>

                  {/* Right / Bottom: Response Inspector Panel */}
                  <Panel defaultSize="50%" minSize="20%" className="flex flex-col h-full overflow-hidden bg-[#141417]">
                    {/* Response Status Bar */}
                    <div className="px-3 py-2 border-b border-[#242428] bg-[#17171a] flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Response</span>
                        {activeResponseState && (
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                'text-xs font-mono font-bold px-2 py-0.5 rounded border ' +
                                (activeResponseState.status >= 200 && activeResponseState.status < 300
                                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                  : 'bg-rose-950/70 border-rose-500/40 text-rose-300')
                              }
                            >
                              {activeResponseState.status} {activeResponseState.statusText}
                            </span>
                            <span className="text-xs font-mono text-zinc-400">{activeResponseState.durationMs} ms</span>
                            <span className="text-xs font-mono text-zinc-500">•</span>
                            <span className="text-xs font-mono text-zinc-400">{activeResponseState.sizeKb} KB</span>
                          </div>
                        )}
                      </div>

                      {activeResponseState && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              typeof activeResponseState.data === 'object'
                                ? JSON.stringify(activeResponseState.data, null, 2)
                                : String(activeResponseState.data)
                            );
                            showToast('Response copied to clipboard', 'success');
                          }}
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#202024] border border-zinc-700/60 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      )}
                    </div>

                    {/* Response Body Inspector */}
                    <div className="flex-1 overflow-auto p-3 bg-[#111114]">
                      {activeResponseState ? (
                        <pre className="text-xs font-mono text-zinc-200 whitespace-pre leading-relaxed select-text">
                          {typeof activeResponseState.data === 'object'
                            ? JSON.stringify(activeResponseState.data, null, 2)
                            : activeResponseState.data}
                        </pre>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none text-zinc-500">
                          <div className="w-12 h-12 rounded-2xl bg-[#1a1a1e] border border-[#2b2b30] flex items-center justify-center mb-3 text-zinc-400">
                            <Send className="w-5 h-5 text-brand-400 opacity-80" />
                          </div>
                          <span className="text-xs font-semibold text-zinc-300">No response yet</span>
                          <span className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-normal">
                            Enter a URL and click <strong className="text-brand-400">Send</strong> to execute the request and view response data, headers, and status metrics.
                          </span>
                        </div>
                      )}
                    </div>
                  </Panel>
                </Group>
              </div>
            </div>
          )}
        </Panel>
      </Group>
    </div>
  );
};
