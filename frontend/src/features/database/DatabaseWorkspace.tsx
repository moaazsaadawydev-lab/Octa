import React from 'react';
import { ActiveSession, DbSubView, QueryTab, SqlQueryFolder, SqlQueryItem } from './types';
import { DatabaseHeader } from './components/DatabaseHeader';
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
      <DatabaseHeader
        activeSession={activeSession}
        dbSubView={dbSubView}
        setDbSubView={setDbSubView}
      />

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
