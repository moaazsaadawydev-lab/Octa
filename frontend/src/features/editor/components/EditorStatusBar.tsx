import React from 'react';
import { EditorTab } from '../../../types/editor';

interface EditorStatusBarProps {
  rootPath: string | null;
  activeTab?: EditorTab | null;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({ rootPath, activeTab }) => {
  return (
    <div className="h-6 px-3 bg-slate-100 dark:bg-[#08090c] border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-mono select-none flex-shrink-0">
      <div className="flex items-center gap-3">
        <span>{rootPath ? '📁 ' + rootPath.replace(/\\/g, '/').split('/').pop() : 'No Project'}</span>
        {activeTab?.isDirty && <span className="text-amber-500 font-medium">● Unsaved</span>}
      </div>
      <div className="flex items-center gap-3">
        {activeTab && <span>{activeTab.language.toUpperCase()}</span>}
        <span>UTF-8</span>
        <span>Spaces: 2</span>
      </div>
    </div>
  );
};
