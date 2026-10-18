import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, FolderOpen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AppSettings } from '../../types/settings';
import { useFileTree } from './hooks/useFileTree';
import { useEditorTabs } from './hooks/useEditorTabs';
import { useSidebarResize } from './hooks/useSidebarResize';
import { defineDark2026Theme, THEME_DARK_2026 } from './utils/themeDark2026';
import { computeLineDiff } from './utils/gitLineDiff';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { EditorTabBar } from './components/EditorTabBar';
import { EditorHeader } from './components/EditorHeader';
import { openEditorDirectoryDialog } from './services/editorApi';
import { attachEditorClickableLinks } from '../../utils/monacoLinks';

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
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const { activeTab } = editorTabsState;

  const updateGitDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeTab) return;

    if (!activeTab.originalContent && activeTab.originalContent !== '') {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const changes = computeLineDiff(activeTab.originalContent || '', activeTab.content);
    const newDecorations = changes.map((c) => {
      const color = c.type === 'added' ? '#2ea043' : c.type === 'modified' ? '#0078d4' : '#f85149';
      return {
        range: new monaco.Range(c.startLine, 1, c.endLine, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: `git-gutter-${c.type}`,
          overviewRuler: { color, position: monaco.editor.OverviewRulerLane.Left },
          minimap: { color, position: monaco.editor.MinimapPosition.Inline },
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [activeTab]);

  useEffect(() => {
    updateGitDecorations();
  }, [updateGitDecorations]);

  const handleContentChange = useCallback((newVal: string) => {
    editorTabsState.updateContent(newVal);

    if (settings?.editorAutoSave === 'afterDelay') {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        editorTabsState.saveActiveTab();
      }, settings?.editorAutoSaveDelay || 1000);
    }
  }, [editorTabsState, settings?.editorAutoSave, settings?.editorAutoSaveDelay]);

  // Auto-save on window blur
  useEffect(() => {
    if (settings?.editorAutoSave !== 'onFocusChange') return;
    const handleBlur = () => {
      if (editorTabsState.activeTab?.isDirty) {
        editorTabsState.saveActiveTab();
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [settings?.editorAutoSave, editorTabsState]);

  const handleSelectRoot = async () => {
    const selected = await openEditorDirectoryDialog();
    if (selected) {
      setRootPath(selected);
      localStorage.setItem('octa_editor_root_path', selected);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden bg-white dark:bg-[#08090c] text-slate-900 dark:text-zinc-100 font-sans">
      {/* Sidebar: File Tree */}
      <FileTreeSidebar
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
            <EditorHeader
              tab={activeTab}
              onSave={editorTabsState.saveActiveTab}
            />
          </>
        )}

        <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#111216]">
          {activeTab ? (
            <Editor
              key={activeTab.id}
              value={activeTab.content}
              language={activeTab.language}
              theme={isDark ? THEME_DARK_2026 : 'light'}
              beforeMount={defineDark2026Theme}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                attachEditorClickableLinks(editor, monaco);
                updateGitDecorations();
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
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center select-none text-slate-400 dark:text-zinc-500">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-brand-500 shadow-sm">
                <Code2 className="w-7 h-7" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                Octa Code Reviewer & Editor
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
                Select any file from the sidebar to review, compare git changes, or make quick edits.
              </p>
              {!rootPath && (
                <button
                  type="button"
                  onClick={handleSelectRoot}
                  className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Open Project Folder</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="h-6 px-3 bg-slate-100 dark:bg-[#08090c] border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-mono select-none flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>{rootPath ? '📁 ' + rootPath.replace(/\\/g, '/').split('/').pop() : 'No Project'}</span>
            {activeTab?.isDirty && (
              <span className="text-amber-500 font-medium">● Unsaved</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab && <span>{activeTab.language.toUpperCase()}</span>}
            <span>UTF-8</span>
            <span>Spaces: 2</span>
          </div>
        </div>
      </div>
    </div>
  );
};
