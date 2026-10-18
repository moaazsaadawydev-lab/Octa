import React from 'react';
import { X } from 'lucide-react';
import { EditorTab, GitStatusMap } from '../../../types/editor';
import { FileIcon } from './FileIcon';

interface EditorTabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  gitStatusMap: GitStatusMap;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  onPinTab?: (tabId: string) => void;
}

export const EditorTabBar: React.FC<EditorTabBarProps> = ({
  tabs,
  activeTabId,
  gitStatusMap,
  onSelectTab,
  onCloseTab,
  onPinTab,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="h-9 bg-slate-100/70 dark:bg-[#10121a] border-b border-slate-200 dark:border-zinc-800 flex items-center overflow-x-auto no-scrollbar select-none text-xs flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const gitStatus = gitStatusMap[tab.relPath];

        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            onDoubleClick={() => onPinTab?.(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) onCloseTab(tab.id, e);
            }}
            title={tab.fullPath + (tab.isPreview ? ' (Preview - Double click to pin)' : '')}
            className={`group relative flex items-center gap-2 px-3 h-full border-r border-slate-200 dark:border-zinc-800 cursor-pointer transition-colors max-w-[200px] ${
              isActive
                ? 'bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-zinc-100 font-medium border-t-2 border-t-brand-500'
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <FileIcon isDir={false} name={tab.title} className="w-3.5 h-3.5 flex-shrink-0" />
            <span
              className={`truncate font-mono text-[11px] ${tab.isPreview ? 'italic opacity-90' : ''} ${
                gitStatus === 'modified' ? 'text-amber-500 font-semibold' : ''
              }`}
            >
              {tab.title}
            </span>

            {/* Dirty or Status Badge */}
            {tab.isDirty ? (
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Unsaved changes" />
            ) : gitStatus === 'modified' ? (
              <span className="text-[9px] font-mono font-bold text-amber-500 flex-shrink-0">M</span>
            ) : null}

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => onCloseTab(tab.id, e)}
              className="p-0.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors opacity-70 group-hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
