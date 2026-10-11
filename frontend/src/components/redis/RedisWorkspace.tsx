import React, { useState, useEffect, useCallback } from 'react';
import { RedisConnectionConfig } from './types';
import { useRedisConnectionState } from './hooks/useRedisConnectionState';
import { useRedisTabs } from './hooks/useRedisTabs';
import { useRedisKeysExplorer } from './hooks/useRedisKeysExplorer';
import { RedisConnectionBar } from './explorer/RedisConnectionBar';
import { RedisSidebar } from './explorer/RedisSidebar';
import { RedisTabBar } from './viewers/RedisTabBar';
import { RedisKeyViewer } from './viewers/RedisKeyViewer';
import { RedisWorkbench } from './RedisWorkbench';
import { RedisZeroState } from './RedisZeroState';
import { RedisModals } from './modals/RedisModals';
import { useTheme } from '../../context/ThemeContext';

export interface RedisWorkspaceProps {
  connections: RedisConnectionConfig[];
  onUpdateConnections: (connections: RedisConnectionConfig[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isVisible?: boolean;
}

export const RedisWorkspace: React.FC<RedisWorkspaceProps> = ({
  connections,
  onUpdateConnections,
  showToast,
  isVisible = true,
}) => {
  const { monacoTheme } = useTheme();
  const [workspaceMode, setWorkspaceMode] = useState<'explorer' | 'workbench'>('explorer');

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('octa_redis_sidebar_width');
      const n = saved ? parseInt(saved) : 280;
      return isNaN(n) ? 280 : Math.max(220, Math.min(550, n));
    } catch {
      return 280;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  // 1. Connection Lifecycle State
  const connState = useRedisConnectionState({
    connections,
    onUpdateConnections,
    showToast,
    onConnected: (conn) => keysExplorer.loadKeys(conn),
  });

  // 2. Tabs State
  const tabsState = useRedisTabs({
    activeConn: connState.activeConn,
    showToast,
    onKeyModified: () => keysExplorer.loadKeys(connState.activeConn),
  });

  // 3. Keys Explorer State
  const keysExplorer = useRedisKeysExplorer({
    activeConn: connState.activeConn,
    activeDb: connState.activeDb,
    showToast,
    onCloseTab: tabsState.handleCloseTab,
    onOpenKeyInTab: tabsState.handleOpenKeyInTab,
  });

  // Connect when user changes activeConnId or activeDb
  useEffect(() => {
    if (connState.activeConn) {
      connState.handleConnect(connState.activeConn);
    } else {
      keysExplorer.setKeys([]);
      tabsState.setTabs([]);
      tabsState.setActiveTabKey(null);
    }
  }, [connState.activeConnId, connState.activeDb]);

  // Handle Drag Resizing of Sidebar
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      setSidebarWidth(Math.max(220, Math.min(550, e.clientX - 52)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('octa_redis_sidebar_width', String(sidebarWidth));
      } catch {}
    };
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, sidebarWidth]);

  // ZERO-STATE SCREEN
  if (connections.length === 0) {
    return (
      <RedisZeroState
        sidebarWidth={sidebarWidth}
        isResizing={isResizing}
        onStartResizing={startResizing}
        isConnModalOpen={connState.isConnModalOpen}
        onCloseConnModal={() => {
          connState.setIsConnModalOpen(false);
          connState.setEditingConn(null);
        }}
        onOpenConnModal={() => {
          connState.setEditingConn(null);
          connState.setIsConnModalOpen(true);
        }}
        onSaveConnection={connState.handleSaveConnection}
        editingConn={connState.editingConn}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0e0e11] text-slate-900 dark:text-zinc-100 font-sans overflow-hidden select-none transition-colors">
      <RedisConnectionBar
        connections={connections}
        activeConnId={connState.activeConnId}
        onSelectConnId={connState.setActiveConnId}
        activeDb={connState.activeDb}
        onSelectDb={connState.setActiveDb}
        isConnected={connState.isConnected}
        isConnecting={connState.isConnecting}
        keysCount={keysExplorer.keys.length}
        workspaceMode={workspaceMode}
        onSelectWorkspaceMode={setWorkspaceMode}
        serverInfo={connState.serverInfo}
        onOpenServerInfo={() => connState.setIsServerInfoOpen(true)}
        onOpenNewKey={() => keysExplorer.setIsNewKeyModalOpen(true)}
        onOpenEditConn={() => {
          connState.setEditingConn(connState.activeConn);
          connState.setIsConnModalOpen(true);
        }}
        onOpenFlushDb={() => keysExplorer.setIsFlushConfirmOpen(true)}
      />

      {workspaceMode === 'workbench' ? (
        <RedisWorkbench
          activeConn={connState.activeConn}
          activeDb={connState.activeDb}
          showToast={showToast}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <RedisSidebar
            sidebarWidth={sidebarWidth}
            keys={keysExplorer.keys}
            isLoadingKeys={keysExplorer.isLoadingKeys}
            searchPattern={keysExplorer.searchPattern}
            onChangePattern={keysExplorer.setSearchPattern}
            onSearch={(pat) => keysExplorer.loadKeys(connState.activeConn, pat)}
            viewMode={keysExplorer.viewMode}
            onToggleViewMode={keysExplorer.setViewMode}
            keyTree={keysExplorer.keyTree}
            expandedFolders={keysExplorer.expandedFolders}
            onToggleFolder={keysExplorer.toggleFolder}
            activeTabKey={tabsState.activeTabKey}
            openTabs={tabsState.tabs.map((t) => t.key)}
            onOpenKey={tabsState.handleOpenKeyInTab}
            onDeleteKey={keysExplorer.handleDeleteKey}
            onTriggerNodeDelete={keysExplorer.handleTriggerNodeDelete}
            onRefresh={() => connState.handleConnect()}
            onNewConnection={() => {
              connState.setEditingConn(null);
              connState.setIsConnModalOpen(true);
            }}
            showToast={showToast}
          />

          <div
            onMouseDown={startResizing}
            className={`w-1 hover:w-1.5 cursor-col-resize select-none transition-colors ${
              isResizing ? 'bg-blue-500 w-1.5' : 'bg-slate-200 dark:bg-zinc-800/80 hover:bg-blue-500/50'
            }`}
          />

          <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0d0d10] overflow-hidden transition-colors">
            <RedisTabBar
              tabs={tabsState.tabs}
              activeTabKey={tabsState.activeTabKey}
              onSelectTab={tabsState.setActiveTabKey}
              onCloseTab={tabsState.handleCloseTab}
            />

            <RedisKeyViewer
              activeTab={tabsState.activeTab}
              monacoTheme={monacoTheme}
              isSaving={tabsState.isSaving}
              isRefreshing={tabsState.isRefreshing}
              onRefresh={() => tabsState.handleRefreshKey()}
              onSave={tabsState.handleSaveActiveTabKey}
              onDelete={keysExplorer.handleDeleteKey}
              onUpdateTTL={tabsState.handleUpdateTTL}
              onChangeDraftString={tabsState.updateDraftString}
              onChangeDraftHash={tabsState.updateDraftHash}
              onChangeDraftList={tabsState.updateDraftList}
              onChangeDraftSet={tabsState.updateDraftSet}
              onChangeDraftZSet={tabsState.updateDraftZSet}
              onOpenNewKey={() => keysExplorer.setIsNewKeyModalOpen(true)}
              isConnected={connState.isConnected}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      <RedisModals
        isConnModalOpen={connState.isConnModalOpen}
        onCloseConnModal={() => {
          connState.setIsConnModalOpen(false);
          connState.setEditingConn(null);
        }}
        onSaveConnection={connState.handleSaveConnection}
        editingConn={connState.editingConn}
        isNewKeyModalOpen={keysExplorer.isNewKeyModalOpen}
        onCloseNewKeyModal={() => keysExplorer.setIsNewKeyModalOpen(false)}
        onCreateKey={keysExplorer.handleCreateKey}
        namespaceDeleteModal={keysExplorer.namespaceDeleteModal}
        isDeletingNamespace={keysExplorer.isDeletingNamespace}
        onCancelNamespaceDelete={() => keysExplorer.setNamespaceDeleteModal(null)}
        onConfirmNamespaceDelete={keysExplorer.handleDeleteNamespace}
        isFlushConfirmOpen={keysExplorer.isFlushConfirmOpen}
        activeDb={connState.activeDb}
        onCancelFlush={() => keysExplorer.setIsFlushConfirmOpen(false)}
        onConfirmFlush={keysExplorer.handleFlushDB}
        isServerInfoOpen={connState.isServerInfoOpen}
        onCloseServerInfo={() => connState.setIsServerInfoOpen(false)}
        serverInfo={connState.serverInfo}
      />
    </div>
  );
};
