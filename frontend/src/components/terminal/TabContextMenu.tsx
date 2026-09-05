import React, { useEffect, useRef } from 'react';
import { Edit2, Columns2, Rows2, X } from 'lucide-react';
import { TerminalTab } from '../../types/terminal';

interface TabContextMenuProps {
  tab: TerminalTab;
  position: { x: number; y: number };
  onClose: () => void;
  onStartRename: (tab: TerminalTab) => void;
  onSelectTab: (tabId: string) => void;
  onSplitTab: (direction: 'horizontal' | 'vertical') => void;
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  tab,
  position,
  onClose,
  onStartRename,
  onSelectTab,
  onSplitTab,
  onCloseTab,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
      }}
      className="z-50 min-w-[160px] py-1 bg-white dark:bg-[#14151d] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl select-none text-xs animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onStartRename(tab);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        <span>Rename Tab</span>
      </button>

      <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />

      <button
        type="button"
        onClick={() => {
          onSelectTab(tab.id);
          onSplitTab('horizontal');
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <Columns2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        <span>Split Right</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onSelectTab(tab.id);
          onSplitTab('vertical');
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <Rows2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        <span>Split Down</span>
      </button>

      <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />

      <button
        type="button"
        onClick={(e) => {
          onCloseTab(tab.id, e);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
        <span>Close Tab</span>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-zinc-500">Ctrl+W</span>
      </button>
    </div>
  );
};
