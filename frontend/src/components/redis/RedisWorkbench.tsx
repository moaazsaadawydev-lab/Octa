import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { defineOctaTheme } from '../../types/http';
import { useTheme } from '../../context/ThemeContext';
import { useEditorLigatures, EDITOR_FONT_FAMILY } from '../../utils/editorSettings';
import { registerRedisLanguage } from '../../utils/monacoRedis';
import { RedisWorkbenchProps } from './workbench/types';
import { useRedisExecution } from './workbench/useRedisExecution';
import { RedisWorkbenchHeader } from './workbench/RedisWorkbenchHeader';
import { RedisResultConsole } from './workbench/RedisResultConsole';
import { RedisHistoryDrawer } from './workbench/RedisHistoryDrawer';

export const RedisWorkbench: React.FC<RedisWorkbenchProps> = ({
  activeConn,
  activeDb,
  showToast,
}) => {
  const { monacoTheme } = useTheme();
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const editorRef = useRef<any>(null);
  const editorFontLigatures = useEditorLigatures(editorRef);
  const monacoRef = useRef<any>(null);

  const currentConfig = activeConn ? { ...activeConn, db: activeDb } : null;

  const {
    commandText,
    setCommandText,
    isRunning,
    history,
    setHistory,
    activeHistoryId,
    setActiveHistoryId,
    handleRun,
    handleInsertTemplate,
  } = useRedisExecution({
    currentConfig,
    editorRef,
    showToast,
  });

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  const activeItem = history.find((h) => h.id === activeHistoryId) || history[0] || null;
  const activeResult = activeItem ? activeItem.result : null;

  const handleEditorBeforeMount = (monaco: any) => {
    monacoRef.current = monaco;
    defineOctaTheme(monaco);
    registerRedisLanguage(monaco);
  };

  const handleEditorOnMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });

    setTimeout(() => {
      try {
        editor.layout();
      } catch {}
    }, 60);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0d0d10] overflow-hidden select-none transition-colors">
      {/* Top Action Bar */}
      <RedisWorkbenchHeader
        isRunning={isRunning}
        canRun={Boolean(currentConfig)}
        onRun={handleRun}
        onInsertTemplate={handleInsertTemplate}
        onClear={() => setCommandText('')}
        isHistoryOpen={isHistoryDrawerOpen}
        onToggleHistory={() => setIsHistoryDrawerOpen((prev) => !prev)}
        historyCount={history.length}
      />

      {/* Main Split: Monaco Editor & Result Console */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Editor Container */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#242429] min-h-[220px] bg-white dark:bg-[#141418]">
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-[#242429] bg-slate-50 dark:bg-[#18181d] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span className="font-semibold text-slate-800 dark:text-zinc-300">Redis CLI Editor</span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                (Type command name for IntelliSense autocomplete)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 dark:text-zinc-500">
              <span>{activeConn ? `${activeConn.name} [db${activeDb}]` : 'Disconnected'}</span>
            </div>
          </div>

          <div className="flex-1 w-full h-full relative overflow-hidden bg-white dark:bg-[#101014]">
            <Editor
              height="100%"
              width="100%"
              language="redis"
              theme={monacoTheme}
              value={commandText}
              beforeMount={handleEditorBeforeMount}
              onMount={handleEditorOnMount}
              onChange={(val) => setCommandText(val || '')}
              options={{
                fontSize: 13,
                fontFamily: EDITOR_FONT_FAMILY,
                fontLigatures: editorFontLigatures,
                minimap: { enabled: false },
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                padding: { top: 12, bottom: 12 },
                suggestOnTriggerCharacters: true,
                quickSuggestions: { other: true, comments: false, strings: true },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                  alwaysConsumeMouseWheel: false,
                },
                overviewRulerBorder: false,
                renderLineHighlight: 'all',
              }}
            />
          </div>
        </div>

        {/* Results Console */}
        <RedisResultConsole
          activeItem={activeItem}
          activeResult={activeResult}
          monacoTheme={monacoTheme}
          editorFontLigatures={editorFontLigatures}
          showToast={showToast}
        />
      </div>

      {/* History Drawer */}
      <RedisHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        history={history}
        activeHistoryId={activeHistoryId}
        onSelectHistory={setActiveHistoryId}
        onClearHistory={() => setHistory([])}
        onLoadIntoEditor={setCommandText}
      />
    </div>
  );
};
