import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Terminal,
  Trash2,
  Copy,
  Check,
  Clock,
  Zap,
  Sparkles,
  History,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  List,
  Table,
  Code2,
  ChevronRight,
  Database,
  Server,
  Layers,
  FileCode,
  Tag
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import {
  RedisConnectionConfig,
  RedisCommandResult,
} from '../../types/redis';
import { executeRedisCommand } from '../../services/api';
import { registerRedisLanguage, REDIS_COMMAND_DOCS } from '../../utils/monacoRedis';
import { defineOctaTheme } from '../../types/http';
import { useTheme } from '../../context/ThemeContext';
import { useEditorLigatures, EDITOR_FONT_FAMILY } from '../../utils/editorSettings';

interface RedisWorkbenchProps {
  activeConn: RedisConnectionConfig | null;
  activeDb: number;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface CommandHistoryItem {
  id: string;
  command: string;
  result: RedisCommandResult;
  timestamp: string;
}

const DEFAULT_WORKBENCH_SCRIPT = `# Redis Workbench / Playground
# Press Ctrl+Enter or Cmd+Enter to run selection or active script

# 1. Server check
PING

# 2. Key-Value String Operations
SET test:user "Octa Admin" EX 120
GET test:user

# 3. Hashes
HSET user:profile name "Moaz Saadawy" role "Architect" city "Cairo"
HGETALL user:profile

# 4. Lists & Sets
LPUSH queue:tasks "task-1" "task-2" "task-3"
LRANGE queue:tasks 0 -1
`;

export const RedisWorkbench: React.FC<RedisWorkbenchProps> = ({
  // Ligatures hook

  activeConn,
  activeDb,
  showToast,
}) => {
  const { monacoTheme } = useTheme();
  const [commandText, setCommandText] = useState<string>(DEFAULT_WORKBENCH_SCRIPT);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'cli' | 'table' | 'json'>('cli');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);

  const editorRef = useRef<any>(null);
  const editorFontLigatures = useEditorLigatures(editorRef);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  // Configure connection with active DB
  const currentConfig = activeConn ? { ...activeConn, db: activeDb } : null;

  // Most recent result
  const activeItem = history.find((h) => h.id === activeHistoryId) || history[0] || null;
  const activeResult: RedisCommandResult | null = activeItem ? activeItem.result : null;

  // Monaco initialization
  const handleEditorBeforeMount = (monaco: any) => {
    monacoRef.current = monaco;
    defineOctaTheme(monaco);
    registerRedisLanguage(monaco);
  };

  const handleEditorOnMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Run command keybinding: Ctrl+Enter / Cmd+Enter
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });

    setTimeout(() => {
      try {
        editor.layout();
      } catch { }
    }, 60);
  };

  // Run selected command or all non-comment lines
  const handleRun = useCallback(async () => {
    if (!currentConfig) {
      showToast('No active Redis connection selected', 'error');
      return;
    }

    let codeToRun = '';
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection && !selection.isEmpty()) {
        codeToRun = editorRef.current.getModel()?.getValueInRange(selection)?.trim() || '';
      }
      if (!codeToRun) {
        codeToRun = editorRef.current.getValue()?.trim() || '';
      }
    } else {
      codeToRun = commandText.trim();
    }

    if (!codeToRun) {
      showToast('Please enter a Redis command to run', 'info');
      return;
    }

    // Split multiple lines and filter comments/empty lines
    const lines = codeToRun
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    if (lines.length === 0) {
      showToast('No executable command found (only comments)', 'info');
      return;
    }

    setIsRunning(true);

    try {
      // Execute each command line in order
      for (const line of lines) {
        const res = await executeRedisCommand(currentConfig, line);
        const newItem: CommandHistoryItem = {
          id: 'cmd-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          command: line,
          result: res,
          timestamp: new Date().toLocaleTimeString(),
        };

        setHistory((prev) => [newItem, ...prev.slice(0, 49)]);
        setActiveHistoryId(newItem.id);

        if (res.resultType === 'error') {
          showToast(`Error: ${res.error || 'Command failed'}`, 'error');
          break;
        }
      }
    } catch (err: any) {
      showToast(`Execution failed: ${err?.message || String(err)}`, 'error');
    } finally {
      setIsRunning(false);
    }
  }, [currentConfig, commandText, showToast]);

  // Listen for Global Shortcut: Ctrl + Enter (Run Redis Command)
  useEffect(() => {
    const handleGlobalRun = () => {
      handleRun();
    };
    window.addEventListener('octa:redis:run', handleGlobalRun);
    return () => window.removeEventListener('octa:redis:run', handleGlobalRun);
  }, [handleRun]);

  // Insert template command into editor
  const handleInsertTemplate = (snippet: string) => {
    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      editorRef.current.executeEdits('template-insert', [
        {
          range: {
            startLineNumber: position?.lineNumber || 1,
            startColumn: position?.column || 1,
            endLineNumber: position?.lineNumber || 1,
            endColumn: position?.column || 1,
          },
          text: '\n' + snippet + '\n',
          forceMoveMarkers: true,
        },
      ]);
      editorRef.current.focus();
    } else {
      setCommandText((prev) => prev + '\n' + snippet);
    }
  };

  // Copy result text to clipboard
  const handleCopyResult = () => {
    if (!activeResult) return;
    const textToCopy =
      typeof activeResult.rawOutput === 'object'
        ? JSON.stringify(activeResult.rawOutput, null, 2)
        : activeResult.formatted || String(activeResult.rawOutput);
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    showToast('Copied result to clipboard', 'info');
  };

  // Structured Table / Map Conversion
  const structuredData = React.useMemo(() => {
    if (!activeResult || !activeResult.rawOutput) return null;

    const raw = activeResult.rawOutput;

    // Map / Hash
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.entries(raw).map(([k, v]) => ({
        key: k,
        value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      }));
    }

    // Array / Slice
    if (Array.isArray(raw)) {
      // Check if even elements (e.g. key-value pairs from HGETALL or ZRANGE WITHSCORES)
      const isHashPair =
        activeItem?.command.toUpperCase().startsWith('HGETALL') ||
        activeItem?.command.toUpperCase().includes('WITHSCORES');

      if (isHashPair && raw.length % 2 === 0 && raw.length > 0) {
        const pairs: Array<{ key: string; value: string }> = [];
        for (let i = 0; i < raw.length; i += 2) {
          pairs.push({
            key: String(raw[i]),
            value: String(raw[i + 1]),
          });
        }
        return pairs;
      }

      return raw.map((item, idx) => ({
        index: idx + 1,
        value: typeof item === 'object' ? JSON.stringify(item) : String(item),
      }));
    }

    return null;
  }, [activeResult, activeItem]);

  // Filtered table rows
  const filteredRows = React.useMemo(() => {
    if (!structuredData) return [];
    if (!tableSearchQuery.trim()) return structuredData;
    const q = tableSearchQuery.toLowerCase();
    return structuredData.filter((row: any) => {
      const k = String(row.key || row.index || '').toLowerCase();
      const v = String(row.value || '').toLowerCase();
      return k.includes(q) || v.includes(q);
    });
  }, [structuredData, tableSearchQuery]);

  // Status Badge Colors & Labels
  const renderResultBadge = (type: string) => {
    switch (type) {
      case 'status':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            OK
          </span>
        );
      case 'integer':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-mono text-[11px] font-bold">
            (integer)
          </span>
        );
      case 'slice':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-400 font-mono text-[11px] font-bold">
            <List className="w-3 h-3" />
            Array ({Array.isArray(activeResult?.rawOutput) ? activeResult?.rawOutput.length : 0})
          </span>
        );
      case 'map':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-400 font-mono text-[11px] font-bold">
            <Table className="w-3 h-3" />
            Hash / Map
          </span>
        );
      case 'string':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-500/40 text-blue-400 font-mono text-[11px] font-bold">
            String
          </span>
        );
      case 'nil':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[11px]">
            (nil)
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-400 font-mono text-[11px] font-bold">
            <AlertCircle className="w-3 h-3" />
            ERR
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px]">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0d0d10] overflow-hidden select-none transition-colors">
      {/* =========================================================================
          TOP WORKBENCH ACTION BAR
         ========================================================================= */}
      <div className="h-12 border-b border-slate-200 dark:border-[#242429] bg-white dark:bg-[#141418] px-4 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Left: Run Button & Connection DB Pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || !currentConfig}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Execute Command (Ctrl+Enter / Cmd+Enter)"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white" />
            )}
            <span>Run</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-emerald-700/60 text-[10px] text-emerald-100 font-mono">
              Ctrl+↵
            </kbd>
          </button>

          {/* Quick Command Snippets Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider mr-1">
              Quick:
            </span>
            {[
              { label: 'PING', cmd: 'PING' },
              { label: 'INFO', cmd: 'INFO' },
              { label: 'DBSIZE', cmd: 'DBSIZE' },
              { label: 'KEYS *', cmd: 'KEYS *' },
              { label: 'SET', cmd: 'SET my_key "Hello Octa" EX 60' },
              { label: 'GET', cmd: 'GET my_key' },
              { label: 'HGETALL', cmd: 'HGETALL user:profile' },
              { label: 'LRANGE', cmd: 'LRANGE my_list 0 -1' },
            ].map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => handleInsertTemplate(tmpl.cmd)}
                className="px-2 py-0.8 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1c22] dark:hover:bg-zinc-700 text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white border border-slate-200 dark:border-zinc-800 text-[11px] font-mono transition-colors cursor-pointer"
                title={`Insert ${tmpl.cmd}`}
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions: Format, Clear, History */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommandText('')}
            className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a20] dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-slate-200 dark:border-zinc-800 text-xs transition-colors cursor-pointer"
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg text-xs border transition-colors cursor-pointer ${isHistoryDrawerOpen
                ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-300 dark:border-blue-500/50 text-blue-600 dark:text-blue-400'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a20] dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border-slate-200 dark:border-zinc-800'
              }`}
            title="Command History"
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKBENCH SPLIT VIEW (EDITOR & RESULTS CONSOLE)
         ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* TOP / LEFT: MONACO EDITOR */}
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

        {/* BOTTOM / RIGHT: RESULTS OUTPUT CONSOLE */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0f0f12] overflow-hidden min-h-[220px]">
          {/* Console Header */}
          <div className="px-4 py-2 border-b border-slate-200 dark:border-[#242429] bg-white dark:bg-[#16161b] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                <Code2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Result Console</span>
              </div>

              {activeResult && renderResultBadge(activeResult.resultType)}

              {activeResult && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                  <span>{activeResult.durationMs.toFixed(2)} ms</span>
                </div>
              )}
            </div>

            {/* View Mode Toggle: CLI vs Table vs JSON */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#101014] border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveViewTab('cli')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${activeViewTab === 'cli'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                title="Raw CLI Output"
              >
                <Terminal className="w-3 h-3" />
                <span>CLI</span>
              </button>

              {structuredData && (
                <button
                  type="button"
                  onClick={() => setActiveViewTab('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${activeViewTab === 'table'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                title="Structured Table View"
                >
                  <Table className="w-3 h-3" />
                  <span>Table</span>
                </button>
              )}

              {activeResult && activeResult.rawOutput && (
                <button
                  type="button"
                  onClick={() => setActiveViewTab('json')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${activeViewTab === 'json'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  title="JSON Output"
                >
                  <FileCode className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              )}

              {activeResult && (
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="p-1 rounded text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
                  title="Copy Output"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Console Output Body */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs">
            {!activeResult ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-zinc-600 select-none py-12">
                <Terminal className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">No command executed yet</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-600 mt-1">
                  Type a Redis command and click <strong className="text-emerald-500 dark:text-emerald-400">Run</strong> or press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 font-mono">Ctrl+Enter</kbd>
                </p>
              </div>
            ) : activeViewTab === 'cli' ? (
              /* RAW CLI VIEW */
              <div className="space-y-2">
                <div className="text-slate-500 dark:text-zinc-500 font-mono text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-zinc-800/80">
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold">&gt;</span>
                  <span className="text-slate-800 dark:text-zinc-300 font-semibold">{activeItem?.command}</span>
                </div>
                <pre
                  className={`p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed ${activeResult.resultType === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                      : activeResult.resultType === 'status'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30'
                        : 'bg-white dark:bg-[#141418] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800/60 shadow-sm'
                    }`}
                >
                  {activeResult.formatted || '(empty response)'}
                </pre>
              </div>
            ) : activeViewTab === 'table' && structuredData ? (
              /* STRUCTURED TABLE VIEW */
              <div className="space-y-3">
                {/* Table Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      placeholder="Filter records..."
                      className="w-full pl-8 pr-3 py-1 bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-zinc-200 outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                    {filteredRows.length} / {structuredData.length} rows
                  </span>
                </div>

                {/* Table Grid */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#141418] shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#18181d] border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold">
                        <th className="py-2 px-3 w-12 text-center">#</th>
                        <th className="py-2 px-3">
                          {'key' in (structuredData[0] || {}) ? 'Field / Key' : 'Index'}
                        </th>
                        <th className="py-2 px-3">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                      {filteredRows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-1.5 px-3 text-center text-slate-400 dark:text-zinc-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {row.key !== undefined ? row.key : row.index}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-slate-800 dark:text-zinc-200 break-all">
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* JSON VIEW */
              <div className="h-full bg-white dark:bg-[#101014] rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
                <Editor
                  height="100%"
                  language="json"
                  theme={monacoTheme}
                  value={JSON.stringify(activeResult.rawOutput, null, 2)}
                  options={{
                    readOnly: true,
                    fontSize: 12,
                    fontFamily: EDITOR_FONT_FAMILY,
                    fontLigatures: editorFontLigatures,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 8, bottom: 8 },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          COMMAND HISTORY DRAWER
         ========================================================================= */}
      {isHistoryDrawerOpen && (
        <div className="border-t border-slate-200 dark:border-[#242429] bg-white dark:bg-[#121216] max-h-48 overflow-y-auto p-3 select-none transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Execution History
            </span>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-[11px] text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-1">
            {history.map((h) => {
              const isSelected = h.id === activeHistoryId;
              return (
                <div
                  key={h.id}
                  onClick={() => {
                    setActiveHistoryId(h.id);
                  }}
                  className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-600/20 border border-blue-400 dark:border-blue-500/40 text-blue-900 dark:text-blue-200 font-medium'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#18181d] dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800/60'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    {renderResultBadge(h.result.resultType)}
                    <span className="truncate font-semibold">{h.command}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 flex-shrink-0">
                    <span>{h.result.durationMs.toFixed(1)}ms</span>
                    <span>{h.timestamp}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommandText(h.command);
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      title="Load Command into Editor"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
