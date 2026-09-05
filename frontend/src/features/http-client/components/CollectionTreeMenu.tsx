import React from 'react';
import { Plus, FolderPlus, Copy, Edit2, Trash2 } from 'lucide-react';

export interface CollectionTreeMenuProps {
  isFolder: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onAddRequest: () => void;
  onAddFolder: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export const CollectionTreeMenu: React.FC<CollectionTreeMenuProps> = ({
  isFolder,
  menuRef,
  onAddRequest,
  onAddFolder,
  onDuplicate,
  onRename,
  onDelete,
}) => {
  return (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-2 top-8 w-44 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-scale-up backdrop-blur-md text-xs"
    >
      {isFolder && (
        <>
          <button
            type="button"
            onClick={onAddRequest}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-brand-400" />
            <span>Add Request</span>
          </button>
          <button
            type="button"
            onClick={onAddFolder}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Folder</span>
          </button>
          <div className="my-1 border-t border-zinc-800/80" />
        </>
      )}

      {!isFolder && (
        <button
          type="button"
          onClick={onDuplicate}
          className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-sky-400" />
          <span>Duplicate</span>
        </button>
      )}

      <button
        type="button"
        onClick={onRename}
        className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
        <span>Rename</span>
      </button>

      <div className="my-1 border-t border-zinc-800/80" />

      <button
        type="button"
        onClick={onDelete}
        className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete</span>
      </button>
    </div>
  );
};
