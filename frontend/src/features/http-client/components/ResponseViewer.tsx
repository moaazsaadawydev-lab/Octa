import React from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Send } from 'lucide-react';
import { HttpResponseState, defineOctaTheme } from '../types';
import { getResponseEditorConfig } from '../utils/responseHelpers';

export interface ResponseViewerProps {
  activeResponseState: HttpResponseState | null;
  monacoTheme: string;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  activeResponseState,
  monacoTheme,
  showToast,
}) => {
  const config = getResponseEditorConfig(activeResponseState);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#141417]">
      {/* Response Status Bar */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-[#242428] bg-slate-50 dark:bg-[#17171a] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-400 uppercase tracking-wider">Response</span>
          {activeResponseState && (
            <div className="flex items-center gap-2">
              <span
                className={
                  'text-xs font-mono font-bold px-2 py-0.5 rounded border ' +
                  (activeResponseState.status >= 200 && activeResponseState.status < 300
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/70 border-rose-500/40 text-rose-300')
                }
              >
                {activeResponseState.status} {activeResponseState.statusText}
              </span>
              <span className="text-xs font-mono text-zinc-400">{activeResponseState.durationMs} ms</span>
              <span className="text-xs font-mono text-zinc-500">•</span>
              <span className="text-xs font-mono text-zinc-400">{activeResponseState.sizeKb} KB</span>
              <span className="text-xs font-mono text-zinc-500">•</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700">
                {config.language}
              </span>
            </div>
          )}
        </div>

        {activeResponseState && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(config.value);
              showToast('Response copied to clipboard', 'success');
            }}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#202024] dark:hover:bg-[#28282e] border border-slate-300 dark:border-zinc-700/60 cursor-pointer transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
        )}
      </div>

      {/* Response Body Inspector with Read-Only Monaco Editor */}
      <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden bg-white dark:bg-[#111114]">
        {activeResponseState ? (
          <Editor
            height="100%"
            language={config.language}
            theme={monacoTheme}
            beforeMount={(monacoInstance) => defineOctaTheme(monacoInstance)}
            value={config.value}
            options={{
              readOnly: true,
              domReadOnly: true,
              fontSize: 12.5,
              fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
              minimap: { enabled: false },
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              bracketPairColorization: { enabled: true },
              padding: { top: 8, bottom: 8 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
                alwaysConsumeMouseWheel: false,
              },
              overviewRulerBorder: false,
              renderLineHighlight: 'all',
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] flex items-center justify-center mb-3 text-slate-500 dark:text-zinc-400 shadow-sm">
              <Send className="w-5 h-5 text-brand-500 dark:text-brand-400 opacity-80" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-300">No response yet</span>
            <span className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-normal">
              Enter a URL and click <strong className="text-brand-500 dark:text-brand-400 font-semibold">Send</strong> to execute the request and view response data, headers, and status metrics.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
