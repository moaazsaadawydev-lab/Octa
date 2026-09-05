import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Key,
  Trash2,
} from 'lucide-react';
import { KeyTreeNode, getAllKeysInNode } from '../types';
import { KeyTypeBadge } from '../viewers/KeyTypeBadge';

interface RedisKeyTreeItemProps {
  node: KeyTreeNode;
  depth?: number;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
  activeTabKey: string | null;
  openTabs: string[];
  onOpenKey: (key: string) => void;
  onTriggerDelete: (node: KeyTreeNode) => void;
  onContextMenu: (e: React.MouseEvent, node: KeyTreeNode) => void;
}

export const RedisKeyTreeItem: React.FC<RedisKeyTreeItemProps> = ({
  node,
  depth = 0,
  expandedFolders,
  onToggleFolder,
  activeTabKey,
  openTabs,
  onOpenKey,
  onTriggerDelete,
  onContextMenu,
}) => {
  const isExpanded = expandedFolders[node.fullPath] !== false; // default open
  const hasChildren = Object.keys(node.children).length > 0;

  if (node.name === 'root') {
    return (
      <div className="space-y-0.5">
        {Object.values(node.children).map((child) => (
          <RedisKeyTreeItem
            key={child.fullPath}
            node={child}
            depth={0}
            expandedFolders={expandedFolders}
            onToggleFolder={onToggleFolder}
            activeTabKey={activeTabKey}
            openTabs={openTabs}
            onOpenKey={onOpenKey}
            onTriggerDelete={onTriggerDelete}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    );
  }

  if (!node.isLeaf || hasChildren) {
    const childCount = getAllKeysInNode(node).length;
    return (
      <div className="select-none">
        <div
          onClick={() => onToggleFolder(node.fullPath)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, node);
          }}
          style={{ paddingLeft: depth * 14 + 8 }}
          className="w-full pr-2 py-1.5 rounded-lg flex items-center gap-1.5 text-left transition-all cursor-pointer text-zinc-300 hover:text-zinc-100 hover:bg-[#1a1a1e] group"
        >
          <button type="button" className="p-0.5 text-zinc-500 hover:text-zinc-300">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-blue-400/90 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-blue-400/70 flex-shrink-0" />
          )}
          <span className="text-xs font-mono font-medium truncate flex-1 text-zinc-200">
            {node.name}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono mr-1">{childCount}</span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTriggerDelete(node);
            }}
            title={`Delete namespace "${node.fullPath}" (${childCount} keys)`}
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-all cursor-pointer flex-shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {isExpanded && hasChildren && (
          <div className="space-y-0.5">
            {Object.values(node.children).map((child) => (
              <RedisKeyTreeItem
                key={child.fullPath}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                activeTabKey={activeTabKey}
                openTabs={openTabs}
                onOpenKey={onOpenKey}
                onTriggerDelete={onTriggerDelete}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf key
  const isTabActive = activeTabKey === node.fullPath;
  const isTabOpen = openTabs.includes(node.fullPath);

  return (
    <div
      onClick={() => onOpenKey(node.fullPath)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, node);
      }}
      style={{ paddingLeft: depth * 14 + 22 }}
      className={`w-full pr-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group select-none ${
        isTabActive
          ? 'bg-blue-600/20 text-white font-medium border-l-2 border-blue-400 shadow-sm'
          : isTabOpen
          ? 'bg-zinc-800/40 text-blue-300'
          : 'text-zinc-300 hover:text-zinc-100 hover:bg-[#1a1a1e]'
      }`}
    >
      <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
        <Key className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="text-xs font-mono truncate text-zinc-200">{node.name}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {node.keyInfo && <KeyTypeBadge type={node.keyInfo.type} />}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTriggerDelete(node);
          }}
          title={`Delete key "${node.fullPath}"`}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-all cursor-pointer ml-1"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
