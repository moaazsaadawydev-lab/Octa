import React, { useState, useMemo } from 'react';
import { Terminal, Copy, Check, Clock, Code2, Table, FileCode } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { RedisCommandResult } from '../../../types/redis';
import { EDITOR_FONT_FAMILY } from '../../../utils/editorSettings';
import { CommandHistoryItem } from './types';
import { RedisResultBadge } from './RedisResultBadge';
import { RedisResultTable } from './RedisResultTable';

interface RedisResultConsoleProps {
  activeItem: CommandHistoryItem | null;
  activeResult: RedisCommandResult | null;
  monacoTheme: string;
  editorFontLigatures: any;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RedisResultConsole: React.FC<RedisResultConsoleProps> = ({
  activeItem,
  activeResult,
  monacoTheme,
  editorFontLigatures,
  showToast,
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'cli' | 'table' | 'json'>('cli');
  const [isCopied, setIsCopied] = useState<boolean>(false);

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

  const structuredData = useMemo(() => {
    if (!activeResult || !activeResult.rawOutput) return null;
    const raw = activeResult.rawOutput;

    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.entries(raw).map(([k, v]) => ({
        key: k,
        value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      }));
    }

    if (Array.isArray(raw)) {
      const isHashPair =
        activeItem?.command.toUpperCase().startsWith('HGETALL') ||
        activeItem?.command.toUpperCase().includes('WITHSCORES');

      if (isHashPair && raw.length % 2 === 0 && raw.length > 0) {
        const pairs: Array<{ key: string; value: string }> = [];
        for (let i = 0; i < raw.length; i += 2) {
          pairs.push({ key: String(raw[i]), value: String(raw[i + 1]) });
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

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0f0f12] overflow-hidden min-h-[220px]">
      {/* Console Header */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-[#242429] bg-white dark:bg-[#16161b] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
            <Code2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Result Console</span>
          </div>
          {activeResult && <RedisResultBadge type={activeResult.resultType} count={Array.isArray(activeResult.rawOutput) ? activeResult.rawOutput.length : 0} />}
          {activeResult && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <span>{activeResult.durationMs.toFixed(2)} ms</span>
            </div>
          )}
        </div>

        {/* View Mode Toggle: CLI vs Table vs JSON */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#101014] border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setActiveViewTab('cli')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeViewTab === 'cli' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>CLI</span>
          </button>

          {structuredData && (
            <button
              type="button"
              onClick={() => setActiveViewTab('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeViewTab === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Table</span>
            </button>
          )}

          {activeResult?.rawOutput && (
            <button
              type="button"
              onClick={() => setActiveViewTab('json')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeViewTab === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
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
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
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
          <div className="space-y-2">
            <div className="text-slate-500 dark:text-zinc-500 font-mono text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-zinc-800/80">
              <span className="text-emerald-500 dark:text-emerald-400 font-bold">&gt;</span>
              <span className="text-slate-800 dark:text-zinc-300 font-semibold">{activeItem?.command}</span>
            </div>
            <pre
              className={`p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed ${
                activeResult.resultType === 'error'
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
          <RedisResultTable data={structuredData} />
        ) : (
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
  );
};
