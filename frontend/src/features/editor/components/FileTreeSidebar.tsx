import React, { useState } from 'react';
import {
  FolderOpen,
  RefreshCw,
  FilePlus,
  FolderPlus,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  ChevronsDownUp,
} from 'lucide-react';
import { FileNode, GitStatusMap } from '../../../types/editor';
import { FileTreeItem } from './FileTreeItem';

interface FileTreeSidebarProps {
  rootPath: string | null;
  fileTree: FileNode[];
  gitStatusMap: GitStatusMap;
  expandedPaths: Set<string>;
  searchQuery: string;
  loading: boolean;
  activeFilePath: string | null;
  onSelectRoot: () => void;
  onRefresh: () => void;
  onToggleFolder: (path: string) => void;
  onSelectFile: (node: FileNode) => void;
  onSearchChange: (q: string) => void;
  onCreateFile: (fullPath: string) => Promise<void>;
  onCreateFolder: (fullPath: string) => Promise<void>;
  width?: number;
  onCollapseAll?: () => void;
}

export const FileTreeSidebar: React.FC<FileTreeSidebarProps> = ({
  rootPath,
  fileTree,
  gitStatusMap,
  expandedPaths,
  searchQuery,
  loading,
  activeFilePath,
  onSelectRoot,
  onRefresh,
  onToggleFolder,
  onSelectFile,
  onSearchChange,
  onCreateFile,
  onCreateFolder,
  width,
  onCollapseAll,
}) => {
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const folderName = rootPath
    ? rootPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || rootPath
    : 'No Project Folder';

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    const lower = query.toLowerCase();
    const result: FileNode[] = [];
    for (const node of nodes) {
      if (node.isDir) {
        const filteredChildren = filterTree(node.children || [], query);
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lower)) {
          result.push({ ...node, children: filteredChildren });
        }
      } else if (node.name.toLowerCase().includes(lower)) {
        result.push(node);
      }
    }
    return result;
  };

  const displayedTree = filterTree(fileTree, searchQuery);

  const handleConfirmCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !rootPath) return;
    const fullPath = `${rootPath}/${newItemName.trim()}`;
    if (isCreating === 'file') {
      await onCreateFile(fullPath);
    } else {
      await onCreateFolder(fullPath);
    }
    setIsCreating(null);
    setNewItemName('');
  };

  return (
    <div
      style={{ width: width ? `${width}px` : undefined }}
      className="w-full h-full bg-slate-50 dark:bg-[#0c0d12] flex flex-col select-none text-xs flex-shrink-0"
    >
      {/* Root Header */}
      <div className="p-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div
          onClick={onSelectRoot}
          title={rootPath || 'Click to select project directory'}
          className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200 truncate cursor-pointer hover:text-brand-500 transition-colors flex-1"
        >
          <FolderOpen className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <span className="truncate">{folderName}</span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={() => setIsCreating('file')}
            title="New File"
            className="p-1 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreating('folder')}
            title="New Folder"
            className="p-1 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            title="Collapse All Folders"
            className="p-1 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded cursor-pointer"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Files"
            className="p-1 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-2.5 py-2 border-b border-slate-200 dark:border-zinc-800/80">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter files..."
            className="w-full pl-7 pr-6 py-1 bg-white dark:bg-[#15171f] border border-slate-200 dark:border-zinc-700/80 rounded text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* New Item Prompt */}
      {isCreating && (
        <form onSubmit={handleConfirmCreate} className="p-2 border-b border-brand-500/30 bg-brand-50/20 dark:bg-brand-950/20">
          <input
            type="text"
            autoFocus
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={isCreating === 'file' ? 'filename.ts' : 'folder_name'}
            onBlur={() => { if (!newItemName.trim()) setIsCreating(null); }}
            className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-brand-500 rounded text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </form>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5 font-mono">
        {displayedTree.length === 0 ? (
          <div className="p-4 text-center text-slate-400 dark:text-zinc-500">
            {rootPath ? 'No files match your search' : 'Click above to select a project folder'}
          </div>
        ) : (
          displayedTree.map((node) => (
            <FileTreeItem
              key={node.fullPath}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              gitStatusMap={gitStatusMap}
              activeFilePath={activeFilePath}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
};
