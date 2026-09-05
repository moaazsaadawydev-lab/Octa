import { useState } from 'react';
import { HttpFolderItem, HttpTreeItem } from '../types';
import { reorderTreeAfterDrop } from '../utils/treeMutations';

export interface UseTreeDragDropOptions {
  collections: HttpFolderItem[];
  saveTreeData: (tree: HttpFolderItem[]) => void;
}

export function useTreeDragDrop({ collections, saveTreeData }: UseTreeDragDropOptions) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    id: string;
    position: 'before' | 'inside' | 'after';
  } | null>(null);

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
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let position: 'before' | 'inside' | 'after' = 'inside';
    if (targetItem.type === 'request') {
      position = offsetY < rect.height / 2 ? 'before' : 'after';
    } else {
      position = offsetY < rect.height * 0.25 ? 'before' : offsetY > rect.height * 0.75 ? 'after' : 'inside';
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
    if (draggedId && dragOverTarget && draggedId !== targetItem.id) {
      saveTreeData(reorderTreeAfterDrop(collections, draggedId, targetItem, dragOverTarget.position));
    }
    setDraggedId(null);
    setDragOverTarget(null);
  };

  return {
    draggedId,
    dragOverTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
