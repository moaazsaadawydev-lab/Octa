import React from 'react';
import { Table, Terminal, Layers } from 'lucide-react';
import { ActiveSession, DbSubView } from '../types';

export interface DatabaseHeaderProps {
  activeSession: ActiveSession | null;
  dbSubView: DbSubView;
  setDbSubView: (view: DbSubView) => void;
  isConsoleExpanded?: boolean;
  onToggleConsole?: () => void;
}

export const DatabaseHeader: React.FC<DatabaseHeaderProps> = ({
  activeSession,
  dbSubView,
  setDbSubView,
  isConsoleExpanded,
  onToggleConsole,
}) => {
  if (!activeSession) return null;

  const conn = activeSession.connection;
  const connDisplayName = conn.name || `${conn.type || 'db'} (${conn.host})`;

  return (
    <div className="h-10 px-4 pr-6 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d12] flex items-center justify-between gap-4 text-xs select-none flex-shrink-0 z-20 font-sans">
      {/* 1. Left: Breadcrumb / Active DB Name */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm tracking-tight truncate">
          {activeSession.activeDatabase}
        </span>
        <span className="text-slate-400 dark:text-zinc-500 font-mono text-xs truncate">
          ({connDisplayName})
        </span>
      </div>

      {/* 2. Center/Right: Navigation Switch Buttons (Tables | SQL Playground | ERD) */}
      <div className="flex items-center bg-slate-100 dark:bg-[#141416] border border-slate-300 dark:border-zinc-800 p-0.5 rounded-lg shadow-xs flex-shrink-0">
        <button
          type="button"
          onClick={() => setDbSubView('tables')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
            dbSubView === 'tables'
              ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-xs border border-slate-200/80 dark:border-zinc-700/60'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Table className="w-3.5 h-3.5 text-brand-500" />
          <span>Tables</span>
        </button>

        <button
          type="button"
          onClick={() => setDbSubView('playground')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
            dbSubView === 'playground'
              ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-xs border border-slate-200/80 dark:border-zinc-700/60'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-amber-500" />
          <span>SQL Playground</span>
        </button>

        <button
          type="button"
          onClick={() => setDbSubView('erd')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
            dbSubView === 'erd'
              ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-xs border border-slate-200/80 dark:border-zinc-700/60'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-500" />
          <span>ERD</span>
        </button>
      </div>

      {/* 3. Right End: Server Connection Details & Actions (with pr-6 safe margin) */}
      <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-400 font-mono text-[11px] flex-shrink-0">
        <span
          className="hidden md:inline-block text-slate-500 dark:text-zinc-400 truncate max-w-[200px]"
          title={`${conn.host}:${conn.port}`}
        >
          {conn.host}:{conn.port}
        </span>

        {conn.type && (
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-300">
            {conn.type}
          </span>
        )}

        {onToggleConsole && (
          <button
            type="button"
            onClick={onToggleConsole}
            className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isConsoleExpanded ? 'Hide Console' : 'Console'}
          </button>
        )}
      </div>
    </div>
  );
};
