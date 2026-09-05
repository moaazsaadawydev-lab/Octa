import React from 'react';
import Editor from '@monaco-editor/react';
import { Sparkles, Minimize2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEFAULT_JSON_BODY, defineOctaTheme } from '../../types';

export interface JsonBodyEditorProps {
  bodyContent: string;
  onBodyChange: (val: string) => void;
  onFormatJson: () => void;
  onMinifyJson: () => void;
  onClearJson: () => void;
  monacoTheme: string;
}

export function getJsonValidity(content: string): { isValid: boolean; error?: string } {
  if (!content || !content.trim()) return { isValid: true };
  try {
    JSON.parse(content);
    return { isValid: true };
  } catch (e: any) {
    return { isValid: false, error: e?.message || 'Syntax Error' };
  }
}

export const JsonBodyEditor: React.FC<JsonBodyEditorProps> = ({
  bodyContent,
  onBodyChange,
  onFormatJson,
  onMinifyJson,
  onClearJson,
  monacoTheme,
}) => {
  const validity = getJsonValidity(bodyContent);

  return (
    <div className="flex-1 flex flex-col min-h-[260px] h-full border border-slate-200 dark:border-[#2b2b30] rounded-xl overflow-hidden bg-white dark:bg-[#141416]">
      {/* Action Toolbar */}
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-[#242428] bg-slate-50 dark:bg-[#18181c] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          {!bodyContent?.trim() ? (
            <span className="text-[11px] text-zinc-500 font-mono">Empty JSON</span>
          ) : validity.isValid ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Valid JSON</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-400 text-[10px] font-medium font-mono truncate max-w-xs" title={validity.error}>
              <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
              <span className="truncate">{validity.error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onFormatJson}
            title="Format JSON (Prettier)"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#222226] dark:hover:bg-[#2b2b30] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700/60 text-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Format</span>
          </button>
          <button
            type="button"
            onClick={onMinifyJson}
            title="Minify / Compress JSON"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#222226] dark:hover:bg-[#2b2b30] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700/60 text-xs transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3 h-3 text-sky-400" />
            <span>Minify</span>
          </button>
          <button
            type="button"
            onClick={onClearJson}
            title="Clear JSON"
            className="p-1 rounded bg-slate-100 hover:bg-rose-100 dark:bg-[#222226] dark:hover:bg-rose-950/50 text-zinc-400 hover:text-rose-500 border border-slate-200 dark:border-zinc-700/60 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 w-full h-full min-h-[220px] relative overflow-hidden bg-white dark:bg-[#141416]">
        <Editor
          height="100%"
          width="100%"
          language="json"
          theme={monacoTheme}
          beforeMount={(monacoInstance) => defineOctaTheme(monacoInstance)}
          onMount={(editor) => {
            setTimeout(() => {
              try { editor.layout(); } catch {}
            }, 60);
          }}
          value={bodyContent !== undefined ? bodyContent : DEFAULT_JSON_BODY}
          onChange={(val) => onBodyChange(val || '')}
          options={{
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
            formatOnPaste: true,
            padding: { top: 12, bottom: 12 },
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
  );
};
