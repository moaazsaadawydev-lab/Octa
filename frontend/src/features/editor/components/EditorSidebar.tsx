import React, { useState } from 'react';
import { Files, Search } from 'lucide-react';
import { FileNode, GitStatusMap } from '../../../types/editor';
import { FileTreeSidebar } from './FileTreeSidebar';
import { ProjectSearchSidebar } from './ProjectSearchSidebar';

export type SidebarTab = 'explorer' | 'search';

interface EditorSidebarProps {
  rootPath: string | null;
  fileTree: FileNode[];
  gitStatusMap: GitStatusMap;
  expandedPaths: Set<string>;
  searchQuery: string;
  loading: boolean;
  activeFilePath: string | null;
  width?: number;
  onSelectRoot: () => void;
  onRefresh: () => void;
  onToggleFolder: (path: string) => void;
  onSelectFile: (node: FileNode) => void;
  onSearchChange: (q: string) => void;
  onCreateFile: (fullPath: string) => Promise<void>;
  onCreateFolder: (fullPath: string) => Promise<void>;
  onCollapseAll?: () => void;
  onSelectSearchLocation: (filePath: string, line: number, col: number, matchLen: number) => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  rootPath,
  fileTree,
  gitStatusMap,
  expandedPaths,
  searchQuery,
  loading,
  activeFilePath,
  width,
  onSelectRoot,
  onRefresh,
  onToggleFolder,
  onSelectFile,
  onSearchChange,
  onCreateFile,
  onCreateFolder,
  onCollapseAll,
  onSelectSearchLocation,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('explorer');

  return (
    <div
      style={{ width: width ? `${width}px` : undefined }}
      className="w-64 min-w-[160px] h-full bg-slate-50 dark:bg-[#0c0d12] border-r border-slate-200 dark:border-zinc-800 flex flex-col select-none text-xs flex-shrink-0 overflow-hidden"
    >
      {/* Top Sidebar Tab Switcher */}
      <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-[#10121a] px-2 pt-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'explorer'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-[#0c0d12] rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Files className="w-3.5 h-3.5" />
          <span>Explorer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'search'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-[#0c0d12] rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'explorer' ? (
          <FileTreeSidebar
            rootPath={rootPath}
            fileTree={fileTree}
            gitStatusMap={gitStatusMap}
            expandedPaths={expandedPaths}
            searchQuery={searchQuery}
            loading={loading}
            activeFilePath={activeFilePath}
            onSelectRoot={onSelectRoot}
            onRefresh={onRefresh}
            onToggleFolder={onToggleFolder}
            onSelectFile={onSelectFile}
            onSearchChange={onSearchChange}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onCollapseAll={onCollapseAll}
          />
        ) : (
          <ProjectSearchSidebar
            rootPath={rootPath}
            onSelectLocation={onSelectSearchLocation}
          />
        )}
      </div>
    </div>
  );
};
