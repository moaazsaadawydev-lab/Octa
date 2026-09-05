import React from 'react';
import { Globe, Upload, FolderPlus, Plus, Search } from 'lucide-react';
import { HttpFolderItem } from '../types';
import { CollectionTreeItem, CollectionTreeItemProps } from './CollectionTreeItem';

export interface CollectionsSidebarProps extends Omit<CollectionTreeItemProps, 'item' | 'depth'> {
  collections: HttpFolderItem[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileImportChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCreateNewCollection: () => void;
  setSearchQuery: (query: string) => void;
}

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = (props) => {
  const {
    collections,
    fileInputRef,
    handleFileImportChange,
    handleCreateNewCollection,
    handleCreateNewRequest,
    searchQuery,
    setSearchQuery,
  } = props;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#161618]">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-200 dark:border-[#26262a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import Postman Collection (JSON)"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreateNewCollection}
            title="New Collection"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
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
        <div className="px-3 py-2 border-b border-slate-200 dark:border-[#26262a]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter requests & folders..."
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-100 dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2b2b30] rounded-md text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand-500 outline-none font-mono"
            />
          </div>
        </div>
      )}

      {/* Tree View Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {collections.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center select-none text-zinc-500">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-[#2b2b2b] flex items-center justify-center mb-3 text-zinc-400">
              <FolderPlus className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-300">No Collections</span>
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
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2b2b2b] text-xs transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>New Collection</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 hover:text-brand-500 border border-slate-200 dark:border-[#2b2b2b] text-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-brand-400" />
                <span>Import Postman Collection</span>
              </button>
            </div>
          </div>
        ) : (
          collections.map((col) => (
            <CollectionTreeItem key={col.id} {...props} item={col} depth={0} />
          ))
        )}
      </div>

      {/* Hidden Postman File Importer Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleFileImportChange}
        className="hidden"
      />
    </div>
  );
};
