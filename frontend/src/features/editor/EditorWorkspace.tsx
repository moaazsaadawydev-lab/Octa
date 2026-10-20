import React, { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../context/ThemeContext';
import { AppSettings } from '../../types/settings';
import { useFileTree } from './hooks/useFileTree';
import { useEditorTabs } from './hooks/useEditorTabs';
import { useSidebarResize } from './hooks/useSidebarResize';
import { useEditorAutoSave } from './hooks/useEditorAutoSave';
import { useGitDecorations } from './hooks/useGitDecorations';
import { defineDark2026Theme, THEME_DARK_2026 } from './utils/themeDark2026';
import { EditorSidebar } from './components/EditorSidebar';
import { EditorTabBar } from './components/EditorTabBar';
import { EditorHeader } from './components/EditorHeader';
import { EditorEmptyState } from './components/EditorEmptyState';
import { EditorStatusBar } from './components/EditorStatusBar';
import { openEditorDirectoryDialog } from './services/editorApi';
import { attachEditorClickableLinks } from '../../utils/monacoLinks';
import { initDefinitionProvider, updateDefinitionContext } from './utils/definitionProvider';

export interface EditorWorkspaceProps {
  initialRootPath?: string | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  isVisible: boolean;
  settings?: AppSettings;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  initialRootPath,
  showToast,
  isVisible,
  settings,
}) => {
  const [rootPath, setRootPath] = useState<string | null>(() => {
    return initialRootPath || localStorage.getItem('octa_editor_root_path') || null;
  });

  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const fileTreeState = useFileTree(rootPath);
  const editorTabsState = useEditorTabs({ rootPath, showToast });
  const { width: sidebarWidth, isResizing, startResizing } = useSidebarResize();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const pendingJumpRef = useRef<{ line: number; col: number; matchLen?: number } | null>(null);

  const { activeTab } = editorTabsState;
  const { updateGitDecorations } = useGitDecorations(editorRef, monacoRef, activeTab);

  const { handleContentChange } = useEditorAutoSave({
    settings,
    activeTab,
    updateContent: editorTabsState.updateContent,
    saveActiveTab: editorTabsState.saveActiveTab,
  });

  const applyJump = useCallback((line: number, col: number, matchLen?: number) => {
    if (!editorRef.current) return;
    editorRef.current.revealLineInCenter(line);
    if (matchLen && matchLen > 0 && monacoRef.current) {
      editorRef.current.setSelection(new monacoRef.current.Range(line, col, line, col + matchLen));
    } else {
      editorRef.current.setPosition({ lineNumber: line, column: col });
    }
    editorRef.current.focus();
  }, []);

  // Setup cross-file definition navigation context
  useEffect(() => {
    updateDefinitionContext({
      getRootPath: () => rootPath,
      openFileLocation: async (fullPath, line, col) => {
        const res = await editorTabsState.openFileLocation(fullPath, line, col);
        if (res && line) {
          pendingJumpRef.current = { line, col: col || 1 };
          applyJump(line, col || 1);
        }
        return res;
      },
    });
  }, [rootPath, editorTabsState.openFileLocation, applyJump]);

  // Jump to location when active tab changes
  useEffect(() => {
    if (!pendingJumpRef.current || !editorRef.current) return;
    const { line, col, matchLen } = pendingJumpRef.current;
    pendingJumpRef.current = null;
    setTimeout(() => applyJump(line, col, matchLen), 50);
  }, [activeTab?.id, applyJump]);

  // Handle Ctrl+F for in-file search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || !activeTab) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        editorRef.current?.focus();
        editorRef.current?.trigger('keyboard', 'actions.find', {});
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isVisible, activeTab]);

  const handleSelectSearchLocation = async (filePath: string, line: number, col: number, matchLen: number) => {
    const res = await editorTabsState.openFileLocation(filePath, line, col, matchLen);
    if (res && editorRef.current) {
      applyJump(line, col, matchLen);
    } else {
      pendingJumpRef.current = { line, col, matchLen };
    }
  };

  const handleSelectRoot = async () => {
    const selected = await openEditorDirectoryDialog();
    if (selected) {
      setRootPath(selected);
      localStorage.setItem('octa_editor_root_path', selected);
    }
  };

  return (
    <div
      className={clsx(
        'flex-1 flex h-full w-full overflow-hidden bg-white dark:bg-[#08090c] text-slate-900 dark:text-zinc-100 font-sans',
        !isVisible && 'hidden'
      )}
    >
      {/* Sidebar: Explorer / Search Tabs */}
      <EditorSidebar
        rootPath={rootPath}
        fileTree={fileTreeState.fileTree}
        gitStatusMap={fileTreeState.gitStatusMap}
        expandedPaths={fileTreeState.expandedPaths}
        searchQuery={fileTreeState.searchQuery}
        loading={fileTreeState.loading}
        activeFilePath={editorTabsState.activeTabId}
        onSelectRoot={handleSelectRoot}
        onRefresh={fileTreeState.refreshTree}
        onToggleFolder={fileTreeState.toggleFolder}
        onSelectFile={editorTabsState.openFile}
        onSearchChange={fileTreeState.setSearchQuery}
        onCreateFile={fileTreeState.handleCreateFile}
        onCreateFolder={fileTreeState.handleCreateFolder}
        width={sidebarWidth}
        onCollapseAll={fileTreeState.collapseAllFolders}
        onSelectSearchLocation={handleSelectSearchLocation}
      />

      {/* Resizable Divider Handle */}
      <div
        onMouseDown={startResizing}
        className={`w-1 cursor-col-resize hover:bg-brand-500/80 active:bg-brand-500 transition-colors z-20 flex-shrink-0 select-none relative group ${
          isResizing ? 'bg-brand-500' : 'bg-transparent'
        }`}
        title="Drag to resize file explorer"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Editor Center Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {editorTabsState.tabs.length > 0 && (
          <>
            <EditorTabBar
              tabs={editorTabsState.tabs}
              activeTabId={editorTabsState.activeTabId}
              gitStatusMap={fileTreeState.gitStatusMap}
              onSelectTab={editorTabsState.setActiveTabId}
              onCloseTab={editorTabsState.closeTab}
              onPinTab={editorTabsState.pinTab}
            />
            <EditorHeader tab={activeTab} onSave={editorTabsState.saveActiveTab} />
          </>
        )}

        <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#111216]">
          {activeTab ? (
            <Editor
              key={activeTab.id}
              path={activeTab.fullPath}
              value={activeTab.content}
              language={activeTab.language}
              theme={isDark ? THEME_DARK_2026 : 'light'}
              beforeMount={(monaco) => {
                defineDark2026Theme(monaco);
                initDefinitionProvider(monaco);
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                initDefinitionProvider(monaco);
                attachEditorClickableLinks(editor, monaco);
                updateGitDecorations();
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
                  editor.trigger('keyboard', 'actions.find', {});
                });
                if (pendingJumpRef.current) {
                  applyJump(pendingJumpRef.current.line, pendingJumpRef.current.col, pendingJumpRef.current.matchLen);
                  pendingJumpRef.current = null;
                }
              }}
              onChange={(newVal) => handleContentChange(newVal || '')}
              options={{
                links: true,
                minimap: { enabled: true, maxColumn: 80 },
                fontSize: settings?.editorFontSize || 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: settings?.editorTabSize || 2,
                wordWrap: settings?.editorWordWrap || 'on',
                smoothScrolling: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                renderValidationDecorations: 'off',
                lineDecorationsWidth: 8,
                overviewRulerLanes: 3,
                find: {
                  addExtraSpaceOnTop: true,
                  autoFindInSelection: 'never',
                  seedSearchStringFromSelection: 'always',
                },
              }}
            />
          ) : (
            <EditorEmptyState rootPath={rootPath} onSelectRoot={handleSelectRoot} />
          )}
        </div>

        {/* Bottom Status Bar */}
        <EditorStatusBar rootPath={rootPath} activeTab={activeTab} />
      </div>
    </div>
  );
};
