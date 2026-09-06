import React, { useState, useRef } from 'react';
import {
  ActiveSession,
  QueryTab,
  SqlQueryItem,
  SqlQueryFolder,
  QueryResult,
} from '../types';
import { SqlQueryTabBar } from './SqlQueryTabBar';
import { SqlEditorHeader } from './SqlEditorHeader';
import { SqlCodeEditor } from './SqlCodeEditor';
import { QueryExecutionFooter } from './QueryExecutionFooter';
import { SaveQueryModal } from './SaveQueryModal';
import { QueryHistoryDrawer } from './QueryHistoryDrawer';
import { HomeLanding } from '../../../components/layout/HomeLanding';
import { useQueryExecution } from '../hooks/useQueryExecution';
import { extractFolders } from '../utils/treeHelpers';
import { useVerticalSplitter } from './playground/useVerticalSplitter';
import { QueryResultPanel } from './playground/QueryResultPanel';
import { useQueryTabs } from './playground/useQueryTabs';
import { usePlaygroundSave } from './playground/usePlaygroundSave';

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resultPage, setResultPage] = useState(1);
  const [resultLimit] = useState(50);
  const editorInstanceRef = useRef<any>(null);

  const {
    tabs,
    setTabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    handleAddTab,
    handleCloseTab,
    handleRenameTab,
    handleUpdateTabQuery,
  } = useQueryTabs({
    propTabs,
    propActiveTabId,
    onTabsChange,
    onActiveTabChange,
  });

  const { resultsHeight, containerRef, handleSplitterMouseDown, isDragging } =
    useVerticalSplitter();

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

  const saveOps = usePlaygroundSave({
    activeTab,
    queriesTree,
    onSaveQueriesTree,
    activeDatabase: activeSession?.activeDatabase,
    setTabs,
    showToast,
  });

  const getQueryToExecute = (): string => {
    if (editorInstanceRef.current) {
      const editor = editorInstanceRef.current;
      const model = editor.getModel?.();
      const selection = editor.getSelection?.();
      if (model && selection && !selection.isEmpty()) {
        const selected = model.getValueInRange(selection)?.trim();
        if (selected) return selected;
      }
      const fullVal = editor.getValue?.()?.trim();
      if (fullVal) return fullVal;
    }
    return activeTab?.query?.trim() || '';
  };

  const handleExecute = async (queryOverride?: string) => {
    if (!activeTab) return;
    const sql =
      typeof queryOverride === 'string' && queryOverride.trim()
        ? queryOverride
        : getQueryToExecute();
    await queryExec.runQuery(sql);
  };

  const handleExplain = async (analyze: boolean) => {
    if (!activeTab) return;
    const sql = getQueryToExecute();
    const plan = await queryExec.runExplain(sql, analyze);
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

  if (!activeSession) return <HomeLanding onOpenNewModal={onOpenNewModal} />;

  const currentResult: QueryResult | null =
    activeTab?.results?.[activeTab.activeResultIndex || 0] || null;

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 font-sans">
      <SqlQueryTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onAddTab={handleAddTab}
        onRenameTab={handleRenameTab}
      />

      <SqlEditorHeader
        onExecute={handleExecute}
        onFormat={handleFormat}
        onExplain={handleExplain}
        onSave={saveOps.handleTriggerSave}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        isExecuting={queryExec.isExecuting}
        hasResults={Boolean(currentResult)}
      />

      <div ref={containerRef} className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top Section: Monaco SQL Editor */}
          <div className="flex-1 min-h-[200px] overflow-hidden relative">
            {activeTab && (
              <SqlCodeEditor
                value={activeTab.query}
                onChange={handleUpdateTabQuery}
                onExecute={handleExecute}
                onFormat={handleFormat}
                onSave={saveOps.handleTriggerSave}
                externalEditorRef={editorInstanceRef}
                activeSession={activeSession}
              />
            )}
          </div>

          {/* Draggable Vertical Splitter Divider */}
          <div
            onMouseDown={handleSplitterMouseDown}
            className={`h-2 border-y border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#141416] hover:bg-brand-500/40 cursor-row-resize flex items-center justify-center transition-colors select-none z-20 flex-shrink-0 ${
              isDragging ? 'bg-brand-500/60' : ''
            }`}
            title="Drag to resize Results Panel"
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
          </div>

          {/* Bottom Section: Query Results Panel */}
          <div
            style={{ height: `${resultsHeight}px`, minHeight: '220px' }}
            className="overflow-hidden flex flex-col flex-shrink-0 bg-white dark:bg-[#0c0d12]"
          >
            <QueryResultPanel
              explainPlan={activeTab?.explainPlan}
              currentResult={currentResult}
              isExecuting={queryExec.isExecuting}
              page={resultPage}
              limit={resultLimit}
              onPageChange={setResultPage}
              showToast={showToast}
            />
          </div>
        </div>

        {isHistoryOpen && (
          <QueryHistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            history={queryExec.history}
            onInsertQuery={handleUpdateTabQuery}
            onRunQuery={(sql) => { handleUpdateTabQuery(sql); handleExecute(sql); }}
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
        isOpen={saveOps.isSaveModalOpen}
        onClose={() => saveOps.setIsSaveModalOpen(false)}
        queryName={saveOps.saveModalName}
        setQueryName={saveOps.setSaveModalName}
        folderId={saveOps.saveModalFolderId}
        setFolderId={saveOps.setSaveModalFolderId}
        folders={extractFolders(queriesTree)}
        onConfirm={saveOps.handleConfirmSave}
      />
    </div>
  );
};
