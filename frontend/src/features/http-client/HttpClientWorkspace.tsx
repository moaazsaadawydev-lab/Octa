import React, { useEffect, useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useTheme } from '../../context/ThemeContext';
import { HttpClientWorkspaceProps, getComputedAutoHeaders, getMatchingCookies } from './types';
import { useEnvironments } from './hooks/useEnvironments';
import { useCollections } from './hooks/useCollections';
import { useHttpClient } from './hooks/useHttpClient';
import { useHttpShortcuts } from './hooks/useHttpShortcuts';
import { CollectionsSidebar } from './components/CollectionsSidebar';
import { HttpMainWorkspacePanel } from './components/HttpMainWorkspacePanel';
import { CookieJarModal } from './components/CookieJarModal';
import { EnvironmentModal } from './components/EnvironmentModal';

export const HttpClientWorkspace: React.FC<HttpClientWorkspaceProps> = ({
  data: propData,
  onUpdateData,
  showToast,
}) => {
  const { monacoTheme } = useTheme();
  const envDropdownRef = useRef<HTMLDivElement>(null);

  const envs = useEnvironments({
    initialEnvironments: propData?.environments || [],
    initialActiveEnvironmentId: propData?.activeEnvironmentId ?? null,
    initialGlobalVariables: propData?.globalVariables || [],
    showToast,
  });

  const cols = useCollections({
    initialCollections: propData?.collections || [],
    showToast,
    onPostmanImport: (result) => {
      if (result.variables.length > 0) {
        const newEnv = {
          id: 'env-' + Date.now(),
          name: `${result.collection.name} Env`,
          variables: result.variables,
        };
        const nextEnvs = [...envs.environments, newEnv];
        envs.setEnvironments(nextEnvs);
        if (!envs.activeEnvironmentId) envs.setActiveEnvironmentId(newEnv.id);
        onUpdateData?.({
          collections: cols.collections,
          environments: nextEnvs,
          globalVariables: envs.globalVariables,
          activeEnvironmentId: envs.activeEnvironmentId || newEnv.id,
        });
      }
    },
  });

  useEffect(() => {
    if (propData) {
      cols.setCollections(propData.collections || []);
      envs.setEnvironments(propData.environments || []);
      envs.setGlobalVariables(propData.globalVariables || []);
      envs.setActiveEnvironmentId(propData.activeEnvironmentId ?? null);
    }
  }, [propData]);

  useEffect(() => {
    if (onUpdateData) {
      onUpdateData({
        collections: cols.collections,
        environments: envs.environments,
        globalVariables: envs.globalVariables,
        activeEnvironmentId: envs.activeEnvironmentId,
      });
    }
  }, [cols.collections, envs.environments, envs.globalVariables, envs.activeEnvironmentId]);

  const http = useHttpClient({
    activeRequest: cols.activeRequest,
    activeEnvironment: envs.activeEnvironment,
    globalVariables: envs.globalVariables,
    updateActiveRequest: cols.updateActiveRequest,
    showToast,
  });

  useHttpShortcuts({
    activeTabId: cols.activeTabId,
    onSendRequest: http.handleSendRequest,
    onNewTab: cols.handleNewTab,
    onCloseTab: cols.handleCloseTab,
  });

  const computedAutoHeaders = getComputedAutoHeaders(cols.activeRequest, http.cookieJar);
  const userActiveHeadersCount = cols.activeRequest?.headers.filter((h) => h.enabled && h.key.trim()).length || 0;
  const autoActiveHeadersCount = computedAutoHeaders.filter((h) => h.isEnabled).length;
  const totalActiveHeadersCount = userActiveHeadersCount + autoActiveHeadersCount;
  const matchingCookies = cols.activeRequest ? getMatchingCookies(http.cookieJar, cols.activeRequest.url) : [];

  return (
    <div className="flex-1 flex h-full bg-slate-50 dark:bg-[#121214] text-slate-900 dark:text-zinc-100 overflow-hidden select-none font-sans relative transition-colors">
      <Group orientation="horizontal" id="octa_http_main_split" className="h-full w-full">
        <Panel defaultSize="22%" minSize="14%" maxSize="40%" className="flex flex-col h-full bg-white dark:bg-[#161618] border-r border-slate-200 dark:border-[#26262a]">
          <CollectionsSidebar {...cols} />
        </Panel>

        <Separator className="w-1 bg-slate-200 dark:bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-col-resize relative flex items-center justify-center group/h1">
          <div className="w-0.5 h-8 bg-zinc-600 rounded-full group-hover/h1:bg-brand-300 transition-colors" />
        </Separator>

        <Panel defaultSize="78%" minSize="40%" className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#121214]">
          <HttpMainWorkspacePanel
            tabBarProps={{
              openTabs: cols.openTabs,
              activeTabId: cols.activeTabId,
              activeRequest: cols.activeRequest,
              setActiveTabId: cols.setActiveTabId,
              handleCloseTab: cols.handleCloseTab,
              handleNewTab: cols.handleNewTab,
              environments: envs.environments,
              activeEnvironment: envs.activeEnvironment,
              activeEnvironmentId: envs.activeEnvironmentId,
              setActiveEnvironmentId: envs.setActiveEnvironmentId,
              isEnvDropdownOpen: envs.isEnvDropdownOpen,
              setIsEnvDropdownOpen: envs.setIsEnvDropdownOpen,
              envDropdownRef,
              setIsEnvModalOpen: envs.setIsEnvModalOpen,
              cookieJarCount: http.cookieJar.length,
              setIsCookieJarOpen: http.setIsCookieJarOpen,
              layoutOrientation: http.layoutOrientation,
              setLayoutOrientation: http.setLayoutOrientation,
            }}
            urlBarProps={{
              activeRequest: cols.activeRequest!,
              editingId: cols.editingId,
              editingName: cols.editingName,
              editInputRef: cols.editInputRef,
              isSending: http.isSending,
              activeEnvironment: envs.activeEnvironment,
              globalVariables: envs.globalVariables,
              setEditingId: cols.setEditingId,
              setEditingName: cols.setEditingName,
              commitNameEdit: cols.commitNameEdit,
              updateActiveRequest: cols.updateActiveRequest,
              handleUrlChange: cols.handleUrlChange,
              handleSendRequest: http.handleSendRequest,
              handleUpdateVariableFromInput: envs.handleUpdateVariableFromInput,
              handleOpenManageEnvironments: envs.handleOpenManageEnvironments,
            }}
            activeRequest={cols.activeRequest}
            requestTab={http.requestTab}
            setRequestTab={http.setRequestTab}
            totalActiveHeadersCount={totalActiveHeadersCount}
            matchingCookies={matchingCookies}
            showAutoHeaders={http.showAutoHeaders}
            setShowAutoHeaders={http.setShowAutoHeaders}
            computedAutoHeaders={computedAutoHeaders}
            onParamsChange={cols.handleParamsChange}
            onToggleAutoHeader={http.handleToggleAutoHeader}
            updateActiveRequest={cols.updateActiveRequest}
            setIsCookieJarOpen={http.setIsCookieJarOpen}
            onSwitchBodyType={cols.handleSwitchBodyType}
            onFormatJson={http.handleFormatJson}
            onMinifyJson={http.handleMinifyJson}
            onClearJson={http.handleClearJson}
            monacoTheme={monacoTheme}
            showToast={showToast}
            fileToBase64={http.fileToBase64}
            layoutOrientation={http.layoutOrientation}
            activeResponseState={http.activeResponseState}
            onNewTab={cols.handleNewTab}
          />
        </Panel>
      </Group>

      <CookieJarModal
        isOpen={http.isCookieJarOpen}
        onClose={() => http.setIsCookieJarOpen(false)}
        cookieJar={http.cookieJar}
        saveCookieJar={http.saveCookieJar}
        showToast={showToast}
      />

      <EnvironmentModal
        isOpen={envs.isEnvModalOpen}
        onClose={() => envs.setIsEnvModalOpen(false)}
        environments={envs.environments}
        activeEnvironmentId={envs.activeEnvironmentId}
        globalVariables={envs.globalVariables}
        selectedEnvIdInModal={envs.selectedEnvIdInModal}
        revealedSecrets={envs.revealedSecrets}
        setSelectedEnvIdInModal={envs.setSelectedEnvIdInModal}
        setActiveEnvironmentId={envs.setActiveEnvironmentId}
        setGlobalVariables={envs.setGlobalVariables}
        handleCreateEnvironment={envs.handleCreateEnvironment}
        handleDuplicateEnvironment={envs.handleDuplicateEnvironment}
        handleDeleteEnvironment={envs.handleDeleteEnvironment}
        handleUpdateCurrentEnv={envs.handleUpdateCurrentEnv}
        toggleSecretReveal={(id) => envs.setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }))}
      />
    </div>
  );
};
