import {
  HttpTreeItem,
  HttpFolderItem,
  HttpRequestItem,
  HttpBodyType,
  DEFAULT_JSON_BODY,
} from '../types';

// Helper: Format file size in human-readable units
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

// Helper: Count total requests inside a folder / collection recursively
export function countRequests(item: HttpTreeItem): number {
  if (item.type === 'request') return 1;
  return item.items.reduce((sum, child) => sum + countRequests(child), 0);
}

// Helper: Check if targetId is a descendant of parentId
export function isDescendant(tree: HttpTreeItem[], parentId: string, targetId: string): boolean {
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
export function findItemById(tree: HttpTreeItem[], id: string): HttpTreeItem | null {
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
export function findParentOfItem(
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

export function normalizeItems(items: any[]): (HttpFolderItem | HttpRequestItem)[] {
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
      headers: Array.isArray(item.headers) ? item.headers : [],
      params: Array.isArray(item.params) ? item.params : [],
      bodyType: (item.bodyType as HttpBodyType) || (item.bodyContent ? 'json' : 'none'),
      bodyContent: item.bodyContent || (item.bodyType === 'json' ? DEFAULT_JSON_BODY : ''),
      bodyFormData: Array.isArray(item.bodyFormData) ? item.bodyFormData : [],
      bodyUrlEncoded: Array.isArray(item.bodyUrlEncoded) ? item.bodyUrlEncoded : [],
      disabledAutoHeaders: Array.isArray(item.disabledAutoHeaders) ? item.disabledAutoHeaders : [],
      isDirty: false,
    };
  });
}

// Helper: Normalize collections
export function normalizeCollections(data: any): HttpFolderItem[] {
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
