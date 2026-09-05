import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  MoreVertical,
  Plus,
  FolderPlus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { SqlTreeItem, SqlQueryItem } from '../types';
import { countQueriesInTree } from '../utils/treeHelpers';

export interface SavedQueryItemProps {
  item: SqlTreeItem;
  depth?: number;
  activeQueryId?: string | null;
  editingId: string | null;
  editingName: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  queryMenuOpenId: string | null;
  queryMenuRef: React.RefObject<HTMLDivElement | null>;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  setQueryMenuOpenId: (id: string | null) => void;
  commitQueryRename: () => void;
  onToggleFolder: (folderId: string) => void;
  onSelectQuery?: (query: SqlQueryItem) => void;
  onAddQuery: (parentId: string | null) => void;
  onAddFolder: (parentId: string | null) => void;
  onDeleteItem: (id: string) => void;
  renderChildItems: (children: SqlTreeItem[], depth: number) => React.ReactNode;
}

export const SavedQueryItem: React.FC<SavedQueryItemProps> = ({
  item,
  depth = 0,
  activeQueryId,
  editingId,
  editingName,
  editInputRef,
  queryMenuOpenId,
  queryMenuRef,
  setEditingId,
  setEditingName,
  setQueryMenuOpenId,
  commitQueryRename,
  onToggleFolder,
  onSelectQuery,
  onAddQuery,
  onAddFolder,
  onDeleteItem,
  renderChildItems,
}) => {
  const isFolder = item.type === 'folder';
  const isSelected = !isFolder && activeQueryId === item.id;
  const isEditing = editingId === item.id;
  const isMenuOpen = queryMenuOpenId === item.id;

  return (
    <div className="relative select-none">
      <div
        onClick={() => {
          if (isFolder) {
            onToggleFolder(item.id);
          } else if (onSelectQuery) {
            onSelectQuery(item as SqlQueryItem);
          }
        }}
        style={{ paddingLeft: depth * 14 + 8 }}
        className={
          'w-full pr-2 py-1.5 rounded-lg flex items-center gap-1.5 text-left transition-all cursor-pointer group/qrow ' +
          (isSelected
            ? 'bg-amber-50 dark:bg-zinc-800 text-amber-900 dark:text-white font-medium shadow-sm border-l-2 border-amber-500 dark:border-amber-400'
            : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]')
        }
      >
        {isFolder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFolder(item.id);
            }}
            className="p-0.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 rounded cursor-pointer"
          >
            {item.isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            )}
          </button>
        ) : (
          <span className="w-3.5" />
        )}

        {isFolder ? (
          item.isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400/90 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400/70 flex-shrink-0" />
          )
        ) : (
          <FileCode className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
        )}

        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitQueryRename();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center gap-1 min-w-0"
          >
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={commitQueryRename}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="w-full px-1.5 py-0.5 text-xs font-medium bg-white dark:bg-[#222222] border border-amber-500 rounded text-slate-900 dark:text-white outline-none font-mono"
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
              'text-xs truncate flex-1 font-mono text-[11px] ' +
              (isFolder
                ? 'font-medium text-slate-800 dark:text-zinc-300'
                : 'text-slate-700 dark:text-zinc-300 group-hover/qrow:text-slate-900 dark:group-hover/qrow:text-zinc-100')
            }
          >
            {item.name}
          </span>
        )}

        {isFolder && !isEditing && (
          <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-mono pr-1">
            {countQueriesInTree(item)}
          </span>
        )}

        {!isEditing && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQueryMenuOpenId(isMenuOpen ? null : item.id);
              }}
              title="Options"
              className="opacity-0 group-hover/qrow:opacity-100 p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                ref={queryMenuRef}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] rounded-lg shadow-2xl py-1 z-50 text-xs text-slate-700 dark:text-zinc-300 backdrop-blur-md"
              >
                {isFolder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onAddQuery(item.id)}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Add Query</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddFolder(item.id)}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Add Folder</span>
                    </button>
                    <div className="h-px bg-slate-200 dark:bg-[#262626] my-1" />
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingName(item.name);
                    setQueryMenuOpenId(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                  <span>Rename</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteItem(item.id);
                    setQueryMenuOpenId(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isFolder && item.isOpen && item.items.length > 0 && (
        <div className="space-y-0.5">
          {renderChildItems(item.items, depth + 1)}
        </div>
      )}
    </div>
  );
};
