import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Layers,
  MoreVertical,
} from 'lucide-react';
import { HttpTreeItem, HttpRequestItem, METHOD_COLORS } from '../types';
import { countRequests } from '../utils/treeHelpers';
import { CollectionTreeMenu } from './CollectionTreeMenu';

export interface CollectionTreeItemProps {
  item: HttpTreeItem;
  depth?: number;
  activeTabId: string;
  editingId: string | null;
  editingName: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  menuOpenId: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  draggedId: string | null;
  dragOverTarget: { id: string; position: 'before' | 'inside' | 'after' } | null;
  searchQuery: string;
  setEditingName: (name: string) => void;
  setEditingId: (id: string | null) => void;
  setMenuOpenId: (id: string | null) => void;
  commitNameEdit: () => void;
  toggleFolderOpen: (folderId: string) => void;
  handleOpenRequestInTab: (req: HttpRequestItem) => void;
  handleCreateNewRequest: (parentId?: string | null) => void;
  handleCreateFolder: (parentId: string | null) => void;
  handleDuplicateRequest: (reqId: string) => void;
  handleDeleteItem: (id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragOver: (e: React.DragEvent, item: HttpTreeItem) => void;
  handleDragLeave: (e: React.DragEvent, id: string) => void;
  handleDrop: (e: React.DragEvent, item: HttpTreeItem) => void;
}

export const CollectionTreeItem: React.FC<CollectionTreeItemProps> = (props) => {
  const {
    item,
    depth = 0,
    activeTabId,
    editingId,
    editingName,
    editInputRef,
    menuOpenId,
    menuRef,
    draggedId,
    dragOverTarget,
    searchQuery,
    setEditingName,
    setEditingId,
    setMenuOpenId,
    commitNameEdit,
    toggleFolderOpen,
    handleOpenRequestInTab,
    handleCreateNewRequest,
    handleCreateFolder,
    handleDuplicateRequest,
    handleDeleteItem,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = props;

  const isFolder = item.type === 'collection' || item.type === 'folder';
  const isCollection = item.type === 'collection';
  const isEditing = editingId === item.id;
  const isMenuOpen = menuOpenId === item.id;
  const isDragging = draggedId === item.id;
  const isDragTarget = dragOverTarget?.id === item.id;
  const dropPosition = isDragTarget ? dragOverTarget.position : null;

  if (searchQuery.trim()) {
    const matchSelf = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (item.type === 'request' && !matchSelf) return null;
    if (isFolder && !matchSelf) {
      const hasMatchingChild = (children: HttpTreeItem[]): boolean =>
        children.some(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.type !== 'request' && hasMatchingChild(c.items))
        );
      if (!hasMatchingChild(item.items)) return null;
    }
  }

  return (
    <div
      key={item.id}
      draggable
      onDragStart={(e) => handleDragStart(e, item.id)}
      onDragOver={(e) => handleDragOver(e, item)}
      onDragLeave={(e) => handleDragLeave(e, item.id)}
      onDrop={(e) => handleDrop(e, item)}
      className={'relative transition-opacity select-none ' + (isDragging ? 'opacity-40' : 'opacity-100')}
    >
      {dropPosition === 'before' && (
        <div className="h-0.5 w-full bg-brand-400 my-0.5 rounded shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
      )}
      <div
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={() => (isFolder ? toggleFolderOpen(item.id) : handleOpenRequestInTab(item as HttpRequestItem))}
        className={
          'group relative flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-all ' +
          (dropPosition === 'inside' ? 'bg-brand-500/20 ring-1 ring-brand-400/50 ' : '') +
          (!isFolder && activeTabId === item.id
            ? 'bg-blue-50 dark:bg-[#1f1f23] text-blue-900 dark:text-white font-medium shadow-sm border border-blue-200 dark:border-zinc-700/60'
            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#18181b]')
        }
      >
        <div className="flex items-center gap-2 truncate flex-1 mr-1">
          {isFolder ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              {isCollection ? <Layers className="w-3.5 h-3.5 text-brand-400" /> : item.isOpen ? <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> : <Folder className="w-3.5 h-3.5 text-amber-400/80" />}
            </div>
          ) : (
            <span className={'text-[9px] font-mono font-bold px-1 py-0.2 rounded border flex-shrink-0 ' + (METHOD_COLORS[(item as HttpRequestItem).method]?.badge || METHOD_COLORS.GET.badge)}>
              {(item as HttpRequestItem).method}
            </span>
          )}

          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); commitNameEdit(); }} onClick={(e) => e.stopPropagation()} className="flex items-center flex-1">
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitNameEdit}
                className="w-full px-1.5 py-0.5 text-xs bg-[#1f1f23] border border-brand-500 rounded text-white outline-none font-mono"
              />
            </form>
          ) : (
            <span onDoubleClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditingName(item.name); }} className="truncate select-none font-sans">
              {item.name}
            </span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {isFolder && <span className="text-[10px] text-zinc-600 font-mono group-hover:opacity-0 transition-opacity">{countRequests(item)}</span>}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : item.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-750 text-zinc-400 hover:text-white transition-opacity cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <CollectionTreeMenu
                isFolder={isFolder}
                menuRef={menuRef}
                onAddRequest={() => handleCreateNewRequest(item.id)}
                onAddFolder={() => handleCreateFolder(item.id)}
                onDuplicate={() => handleDuplicateRequest(item.id)}
                onRename={() => { setEditingId(item.id); setEditingName(item.name); setMenuOpenId(null); }}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )}
          </div>
        )}
      </div>

      {dropPosition === 'after' && (
        <div className="h-0.5 w-full bg-brand-400 my-0.5 rounded shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
      )}

      {isFolder && item.isOpen && item.items.length > 0 && (
        <div className="space-y-0.5">
          {item.items.map((child) => (
            <CollectionTreeItem key={child.id} {...props} item={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {isFolder && item.isOpen && item.items.length === 0 && (
        <div style={{ paddingLeft: (depth + 1) * 14 + 12 }} className="py-1 text-[11px] text-zinc-600 italic select-none">
          Empty folder
        </div>
      )}
    </div>
  );
};
