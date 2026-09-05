import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveSession,
  QueryTab,
  SqlQueryItem,
  SqlQueryFolder,
  SqlTreeItem,
  QueryResult,
} from '../types';
import { SqlQueryTabBar } from './SqlQueryTabBar';
import { SqlEditorHeader } from './SqlEditorHeader';
import { SqlCodeEditor } from './SqlCodeEditor';
import { QueryResultsTable } from './QueryResultsTable';
import { QueryExecutionFooter } from './QueryExecutionFooter';
import { SaveQueryModal } from './SaveQueryModal';
import { QueryHistoryDrawer } from './QueryHistoryDrawer';
import { ExplainPlanViewer } from '../../../components/database/ExplainPlanViewer';
import { HomeLanding } from '../../../components/layout/HomeLanding';
import { useQueryExecution } from '../hooks/useQueryExecution';
import { extractFolders } from '../utils/treeHelpers';

export interface QueryPlaygroundProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  tabs?: QueryTab[];
  activeTabId?: string | null;
  onTabsChange?: (tabs: QueryTab[]) => void;
  onActiveTabChange?: (tabId: string | null) => void;
  queriesTree?: (SqlQueryFolder | SqlQueryItem)[];
  onSaveQueriesTree?: (tree: (SqlQueryFolder | SqlQueryItem)[]) => void;
}

const DEFAULT_QUERY = `-- Octa SQL Playground\n-- Press Ctrl + Enter to run selected text or full query\n\nSELECT \n  'Octa' AS application,\n  'Database Management & SQL Workspace' AS milestone,\n  NOW() AS executed_at;\n`;

export const QueryPlayground: React.FC<QueryPlaygroundProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
  tabs: propTabs,
  activeTabId: propActiveTabId,
  onTabsChange,
  onActiveTabChange,
  queriesTree = [],
  onSaveQueriesTree,
}) => {
  const [internalTabs, setInternalTabs] = useState<QueryTab[]>([
    { id: 'tab-1', title: 'Query 1.sql', query: DEFAULT_QUERY, isDirty: false, results: null },
  ]);
  const [internalActiveTabId, setInternalActiveTabId] = useState<string | null>('tab-1');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalName, setSaveModalName] = useState('Untitled.sql');
  const [saveModalFolderId, setSaveModalFolderId] = useState('');
  const [resultPage, setResultPage] = useState(1);
  const [resultLimit] = useState(50);

  const tabs = propTabs !== undefined ? propTabs : internalTabs;
  const setTabs = (updater: QueryTab[] | ((prev: QueryTab[]) => QueryTab[])) => {
    if (onTabsChange) {
      const next = typeof updater === 'function' ? updater(tabs) : updater;
      onTabsChange(next);
    } else {
      setInternalTabs(updater);
    }
  };

  const activeTabId = propActiveTabId !== undefined ? propActiveTabId : internalActiveTabId;
  const setActiveTabId = (id: string | null) => {
    if (onActiveTabChange) onActiveTabChange(id);
    else setInternalActiveTabId(id);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || null;

  const queryExec = useQueryExecution({
    activeSession,
    showToast,
    onSuccess: (results) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, results, activeResultIndex: 0, activeViewMode: 'results', isExecuting: false }
            : t
        )
      );
      setResultPage(1);
    },
  });

  const handleExecute = async (queryOverride?: string) => {
    if (!activeTab) return;
    const sql = queryOverride || activeTab.query;
    await queryExec.runQuery(sql);
  };

  const handleExplain = async (analyze: boolean) => {
    if (!activeTab) return;
    const plan = await queryExec.runExplain(activeTab.query, analyze);
    if (plan) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, explainPlan: plan, activeViewMode: 'explain', isExecuting: false }
            : t
        )
      );
    }
  };

  const handleFormat = () => {
    if (!activeTab) return;
    const formatted = queryExec.formatSql(activeTab.query);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, query: formatted, isDirty: true } : t))
    );
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab || !saveModalName.trim() || !onSaveQueriesTree) return;
    let name = saveModalName.trim();
    if (!name.endsWith('.sql')) name += '.sql';

    const newQuery: SqlQueryItem = {
      id: 'query-' + Date.now(),
      type: 'query',
      name,
      content: activeTab.query,
      database: activeSession?.activeDatabase,
      createdAt: Date.now(),
    };

    if (!saveModalFolderId) {
      onSaveQueriesTree([...queriesTree, newQuery]);
    } else {
      const insert = (items: SqlTreeItem[]): SqlTreeItem[] =>
        items.map((it) =>
          it.id === saveModalFolderId && it.type === 'folder'
            ? { ...it, isOpen: true, items: [newQuery, ...it.items] }
            : it.type === 'folder'
            ? { ...it, items: insert(it.items) }
            : it
        );
      onSaveQueriesTree(insert(queriesTree) as (SqlQueryFolder | SqlQueryItem)[]);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, title: name, isDirty: false } : t))
    );
    setIsSaveModalOpen(false);
    showToast(`Saved query "${name}" to QUERIES`, 'success');
  };

  if (!activeSession) return <HomeLanding onOpenNewModal={onOpenNewModal} />;

  const currentResult: QueryResult | null =
    activeTab?.results?.[activeTab.activeResultIndex || 0] || null;

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 font-sans">
      <SqlQueryTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={(id) => {
          const next = tabs.filter((t) => t.id !== id);
          setTabs(next);
          if (activeTabId === id) setActiveTabId(next[0]?.id || null);
        }}
        onAddTab={() => {
          const id = 'tab-' + Date.now();
          setTabs([...tabs, { id, title: `Query ${tabs.length + 1}.sql`, query: DEFAULT_QUERY }]);
          setActiveTabId(id);
        }}
        onRenameTab={(id, title) =>
          setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
        }
      />

      <SqlEditorHeader
        onExecute={handleExecute}
        onFormat={handleFormat}
        onExplain={handleExplain}
        onSave={() => {
          setSaveModalName(activeTab?.title || 'Untitled.sql');
          setIsSaveModalOpen(true);
        }}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        isExecuting={queryExec.isExecuting}
        hasResults={Boolean(currentResult)}
      />

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-[140px]">
            {activeTab && (
              <SqlCodeEditor
                value={activeTab.query}
                onChange={(q) =>
                  setTabs((prev) =>
                    prev.map((t) => (t.id === activeTabId ? { ...t, query: q, isDirty: true } : t))
                  )
                }
                onExecute={handleExecute}
                onFormat={handleFormat}
              />
            )}
          </div>

          <div className="h-64 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#111113] overflow-hidden flex flex-col">
            {activeTab?.explainPlan ? (
              <ExplainPlanViewer planResult={activeTab.explainPlan} showToast={showToast} />
            ) : (
              <QueryResultsTable
                result={currentResult}
                page={resultPage}
                limit={resultLimit}
                onPageChange={setResultPage}
              />
            )}
          </div>
        </div>

        {isHistoryOpen && (
          <QueryHistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            history={queryExec.history}
            onInsertQuery={(sql) =>
              setTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, query: sql, isDirty: true } : t))
              )
            }
            onRunQuery={(sql) => {
              setTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, query: sql, isDirty: true } : t))
              );
              handleExecute(sql);
            }}
            onClearHistory={queryExec.clearHistory}
            showToast={showToast}
          />
        )}
      </div>

      <QueryExecutionFooter
        activeSession={activeSession}
        isExecuting={queryExec.isExecuting}
        currentResult={currentResult}
      />

      <SaveQueryModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        queryName={saveModalName}
        setQueryName={setSaveModalName}
        folderId={saveModalFolderId}
        setFolderId={setSaveModalFolderId}
        folders={extractFolders(queriesTree)}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
};
