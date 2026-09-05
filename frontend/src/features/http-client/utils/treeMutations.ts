import { HttpFolderItem, HttpRequestItem, HttpTreeItem } from '../types';
import { findItemById, findParentOfItem, isDescendant } from './treeHelpers';

export function toggleFolderInTree(tree: HttpFolderItem[], folderId: string): HttpFolderItem[] {
  return tree.map((col) => {
    if (col.id === folderId) {
      return { ...col, isOpen: !col.isOpen };
    }
    return {
      ...col,
      items: col.items.map((child) => {
        if (child.type !== 'request') {
          return toggleFolderInTree([child], folderId)[0];
        }
        return child;
      }),
    };
  });
}

export function renameItemInTree(
  tree: HttpFolderItem[],
  targetId: string,
  newName: string
): HttpFolderItem[] {
  const renameRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
    return items.map((item) => {
      if (item.id === targetId) return { ...item, name: newName };
      if (item.type !== 'request') return { ...item, items: renameRecursively(item.items) };
      return item;
    });
  };
  return renameRecursively(tree) as HttpFolderItem[];
}

export function deleteItemFromTree(tree: HttpFolderItem[], targetId: string): HttpFolderItem[] {
  const deleteRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
    return items
      .filter((item) => item.id !== targetId)
      .map((item) => {
        if (item.type !== 'request') return { ...item, items: deleteRecursively(item.items) };
        return item;
      });
  };
  return deleteRecursively(tree) as HttpFolderItem[];
}

export function duplicateRequestInTree(
  tree: HttpFolderItem[],
  reqId: string,
  duplicated: HttpRequestItem
): HttpFolderItem[] {
  const duplicateRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
    const next: (HttpFolderItem | HttpRequestItem)[] = [];
    for (const item of items) {
      next.push(item);
      if (item.id === reqId) {
        next.push(duplicated);
      } else if (item.type !== 'request') {
        item.items = duplicateRecursively(item.items);
      }
    }
    return next;
  };
  return duplicateRecursively(tree) as HttpFolderItem[];
}

export function insertItemInTree(
  tree: HttpFolderItem[],
  parentId: string | null,
  item: HttpFolderItem | HttpRequestItem
): HttpFolderItem[] {
  if (!parentId) {
    if (item.type === 'collection') return [...tree, item];
    if (tree.length === 0) return [{ id: 'col-' + Date.now(), type: 'collection', name: 'My Collection', isOpen: true, items: [item] }];
    return [{ ...tree[0], isOpen: true, items: [item, ...tree[0].items] }, ...tree.slice(1)];
  }

  const insertRecursively = (items: HttpFolderItem[]): HttpFolderItem[] => {
    return items.map((folder) => {
      if (folder.id === parentId) {
        return { ...folder, isOpen: true, items: [...folder.items, item] };
      }
      return {
        ...folder,
        items: folder.items.map((child) => (child.type !== 'request' ? insertRecursively([child])[0] : child)),
      };
    });
  };
  return insertRecursively(tree);
}

export function reorderTreeAfterDrop(
  tree: HttpFolderItem[],
  draggedId: string,
  targetItem: HttpTreeItem,
  position: 'before' | 'inside' | 'after'
): HttpFolderItem[] {
  if (isDescendant(tree, draggedId, targetItem.id)) return tree;
  const extracted = findItemById(tree, draggedId);
  if (!extracted) return tree;

  const withoutDragged = deleteItemFromTree(tree, draggedId);

  if (position === 'inside' && targetItem.type !== 'request') {
    return insertItemInTree(withoutDragged, targetItem.id, extracted);
  }

  const parentInfo = findParentOfItem(withoutDragged, targetItem.id);
  if (!parentInfo || parentInfo.parent === null) {
    const targetIdx = withoutDragged.findIndex((c) => c.id === targetItem.id);
    const insertIdx = position === 'before' ? Math.max(0, targetIdx) : targetIdx + 1;
    const newCols = [...withoutDragged];
    newCols.splice(insertIdx, 0, extracted as HttpFolderItem);
    return newCols;
  }

  const { parent, index } = parentInfo;
  const insertIdx = position === 'before' ? index : index + 1;

  const insertInParent = (items: HttpFolderItem[]): HttpFolderItem[] => {
    return items.map((folder) => {
      if (folder.id === parent.id) {
        const newItems = [...folder.items];
        newItems.splice(insertIdx, 0, extracted);
        return { ...folder, items: newItems };
      }
      return {
        ...folder,
        items: folder.items.map((child) => (child.type !== 'request' ? insertInParent([child])[0] : child)),
      };
    });
  };

  return insertInParent(withoutDragged);
}
