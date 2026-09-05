import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, Terminal as TerminalIcon } from 'lucide-react';
import clsx from 'clsx';
import { ShellInfo } from '../../types/terminal';

interface ShellDropdownProps {
  availableShells?: ShellInfo[];
  defaultShellId?: string;
  onAddTab: (shellTarget?: ShellInfo | string) => void;
}

export const ShellDropdown: React.FC<ShellDropdownProps> = ({
  availableShells = [],
  defaultShellId = 'powershell',
  onAddTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const shellList: ShellInfo[] =
    availableShells && availableShells.length > 0
      ? availableShells
      : [
        { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' },
        { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
      ];
  const defaultShell =
    shellList.find((s) => s.id === (defaultShellId || 'powershell')) || shellList[0];

  return (
    <div ref={menuRef} className="relative flex items-center ml-1.5 z-50 flex-shrink-0">
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-100/80 dark:bg-zinc-800/80 p-0.5 shadow-2xs">
        {/* 1. Primary '+' Button: Spawns default shell directly */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            onAddTab(defaultShell);
          }}
          title={`New Terminal Tab (${defaultShell.name}) (Ctrl+Shift+T)`}
          className="p-1 rounded-md text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* 2. Chevron Dropdown Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          title="Choose Shell to Launch (PowerShell, CMD, Git Bash)"
          className={clsx(
            'p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer',
            isOpen && 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white'
          )}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* 3. Discovered Shells Dropdown Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-white dark:bg-[#14151b] border border-slate-200 dark:border-zinc-700 shadow-2xl py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/60 mb-1 flex items-center justify-between">
            <span>Available Shells</span>
            <span className="font-mono text-[9px] lowercase font-normal">{shellList.length} found</span>
          </div>
          <div className="space-y-0.5 px-1">
            {shellList.map((sh) => {
              const isDefault = sh.id === defaultShell.id;
              return (
                <button
                  key={sh.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onAddTab(sh);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TerminalIcon className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-brand-500 flex-shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-slate-800 dark:text-zinc-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {sh.name}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono truncate max-w-[150px]">
                        {sh.path}
                      </div>
                    </div>
                  </div>
                  {isDefault && (
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 flex-shrink-0 ml-1.5">
                      Default
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
