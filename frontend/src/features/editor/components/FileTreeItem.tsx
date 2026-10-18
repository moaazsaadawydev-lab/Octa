import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FileNode, GitStatusMap } from '../../../types/editor';
import { FileIcon } from './FileIcon';

interface FileTreeItemProps {
  node: FileNode;
  depth?: number;
  expandedPaths: Set<string>;
  gitStatusMap: GitStatusMap;
  activeFilePath: string | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (node: FileNode) => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  depth = 0,
  expandedPaths,
  gitStatusMap,
  activeFilePath,
  onToggleFolder,
  onSelectFile,
}) => {
  const isExpanded = expandedPaths.has(node.fullPath);
  const isSelected = activeFilePath === node.fullPath;
  const gitStatus = gitStatusMap[node.path];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDir) {
      onToggleFolder(node.fullPath);
    } else {
      onSelectFile(node);
    }
  };

  const getStatusBadge = () => {
    if (!gitStatus) return null;
    switch (gitStatus) {
      case 'modified':
        return <span className="text-[10px] font-mono font-bold text-amber-500">M</span>;
      case 'added':
        return <span className="text-[10px] font-mono font-bold text-emerald-500">A</span>;
      case 'untracked':
        return <span className="text-[10px] font-mono font-bold text-emerald-500">U</span>;
      case 'deleted':
        return <span className="text-[10px] font-mono font-bold text-rose-500">D</span>;
      case 'renamed':
        return <span className="text-[10px] font-mono font-bold text-sky-500">R</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`group flex items-center justify-between py-1 pr-2 rounded text-xs select-none cursor-pointer transition-colors ${
          isSelected
            ? 'bg-brand-500/15 dark:bg-brand-500/25 text-brand-600 dark:text-brand-300 font-medium'
            : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50'
        }`}
        title={node.path}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {node.isDir ? (
            <span className="w-4 h-4 flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          ) : (
            <span className="w-4" />
          )}

          <FileIcon isDir={node.isDir} isOpen={isExpanded} name={node.name} />
          <span className={`truncate ${gitStatus === 'modified' ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
            {node.name}
          </span>
        </div>

        <div className="flex-shrink-0 ml-1">
          {getStatusBadge()}
        </div>
      </div>

      {node.isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              gitStatusMap={gitStatusMap}
              activeFilePath={activeFilePath}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};
