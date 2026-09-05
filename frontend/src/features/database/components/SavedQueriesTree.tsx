import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, FolderPlus, Plus } from 'lucide-react';
import { SqlQueryItem, SqlQueryFolder, SqlTreeItem } from '../types';
import { SavedQueryItem } from './SavedQueryItem';

export interface SavedQueriesTreeProps {
  queriesTree: (SqlQueryFolder | SqlQueryItem)[];
  activeQueryId?: string | null;
  searchQuery: string;
  onSelectQuery?: (query: SqlQueryItem) => void;
  onToggleFolder: (folderId: string) => void;
  onDeleteItem: (id: string) => void;
  onAddFolder: (parentId: string | null) => void;
  onAddQuery: (parentId: string | null) => void;
  editingId: string | null;
  editingName: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  commitQueryRename: () => void;
}

export const SavedQueriesTree: React.FC<SavedQueriesTreeProps> = ({
  queriesTree,
  activeQueryId,
  searchQuery,
  onSelectQuery,
  onToggleFolder,
  onDeleteItem,
  onAddFolder,
  onAddQuery,
  editingId,
  editingName,
  editInputRef,
  setEditingId,
  setEditingName,
  commitQueryRename,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [queryMenuOpenId, setQueryMenuOpenId] = useState<string | null>(null);
  const queryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (queryMenuRef.current && !queryMenuRef.current.contains(e.target as Node)) {
        setQueryMenuOpenId(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const countAll = (items: SqlTreeItem[]): number => {
    return items.reduce((sum, item) => {
      if (item.type === 'query') return sum + 1;
      return sum + countAll(item.items);
    }, 0);
  };

  const matchesSearch = (item: SqlTreeItem): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (item.name.toLowerCase().includes(q)) return true;
    if (item.type === 'folder') {
      return item.items.some((child) => matchesSearch(child));
    }
    return false;
  };

  const renderItems = (items: SqlTreeItem[], depth: number): React.ReactNode => {
    return items
      .filter((item) => matchesSearch(item))
      .map((item) => (
        <SavedQueryItem
          key={item.id}
          item={item}
          depth={depth}
          activeQueryId={activeQueryId}
          editingId={editingId}
          editingName={editingName}
          editInputRef={editInputRef}
          queryMenuOpenId={queryMenuOpenId}
          queryMenuRef={queryMenuRef}
          setEditingId={setEditingId}
          setEditingName={setEditingName}
          setQueryMenuOpenId={setQueryMenuOpenId}
          commitQueryRename={commitQueryRename}
          onToggleFolder={onToggleFolder}
          onSelectQuery={onSelectQuery}
          onAddQuery={onAddQuery}
          onAddFolder={onAddFolder}
          onDeleteItem={onDeleteItem}
          renderChildItems={renderItems}
        />
      ));
  };

  return (
    <div className="p-2">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800/60 rounded-lg cursor-pointer transition-colors select-none group/qheader mb-1"
      >
        <div className="flex items-center gap-1.5">
          <ChevronRight
            className={'w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ' + (isOpen ? 'rotate-90' : '')}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400/90">
            Queries
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 font-mono">
            {countAll(queriesTree)}
          </span>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onAddFolder(null)}
            title="New Folder"
            className="p-1 rounded-md text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAddQuery(null)}
            title="New SQL Query"
            className="p-1 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-0.5">
          {queriesTree.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
              No saved queries. Click + to create one.
            </div>
          ) : (
            renderItems(queriesTree, 0)
          )}
        </div>
      )}
    </div>
  );
};
