import React from 'react';
import { Table, Terminal, Layers } from 'lucide-react';
import { ActiveSession, DbSubView, QueryTab, SqlQueryFolder, SqlQueryItem } from './types';
import { TablesWorkspace } from './components/TablesWorkspace';
import { QueryPlayground } from './components/QueryPlayground';
import { ErdVisualizer } from '../../components/database/ErdVisualizer';

export interface DatabaseWorkspaceProps {
  activeSession: ActiveSession | null;
  dbSubView: DbSubView;
  setDbSubView: (view: DbSubView) => void;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  queryTabs?: QueryTab[];
  activeQueryTabId?: string | null;
  onQueryTabsChange?: (tabs: QueryTab[]) => void;
  onActiveQueryTabChange?: (tabId: string | null) => void;
  queriesTree?: (SqlQueryFolder | SqlQueryItem)[];
  onSaveQueriesTree?: (tree: (SqlQueryFolder | SqlQueryItem)[]) => void;
}

export const DatabaseWorkspace: React.FC<DatabaseWorkspaceProps> = ({
  activeSession,
  dbSubView,
  setDbSubView,
  onOpenNewModal,
  showToast,
  queryTabs,
  activeQueryTabId,
  onQueryTabsChange,
  onActiveQueryTabChange,
  queriesTree,
  onSaveQueriesTree,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
      {activeSession && (
        <div className="absolute right-4 top-2 z-40 flex items-center bg-slate-100 dark:bg-[#141416] border border-slate-300 dark:border-zinc-800 p-0.5 rounded-lg shadow-sm">
          <button
            type="button"
            onClick={() => setDbSubView('tables')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
              dbSubView === 'tables'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-sm border border-slate-200/80 dark:border-transparent'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
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
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-sm border border-slate-200/80 dark:border-transparent'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
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
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-sm border border-slate-200/80 dark:border-transparent'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
            <span>ERD</span>
          </button>
        </div>
      )}

      {dbSubView === 'playground' ? (
        <QueryPlayground
          activeSession={activeSession}
          onOpenNewModal={onOpenNewModal}
          showToast={showToast}
          tabs={queryTabs}
          activeTabId={activeQueryTabId}
          onTabsChange={onQueryTabsChange}
          onActiveTabChange={onActiveQueryTabChange}
          queriesTree={queriesTree}
          onSaveQueriesTree={onSaveQueriesTree}
        />
      ) : dbSubView === 'erd' ? (
        <ErdVisualizer
          activeSession={activeSession}
          onOpenNewModal={onOpenNewModal}
          showToast={showToast}
        />
      ) : (
        <TablesWorkspace
          activeSession={activeSession}
          onOpenNewModal={onOpenNewModal}
          showToast={showToast}
        />
      )}
    </div>
  );
};
