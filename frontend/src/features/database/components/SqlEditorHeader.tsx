import React, { useState } from 'react';
import {
  Play,
  Save,
  Wand2,
  Activity,
  History,
  Download,
  Loader2,
  ChevronDown,
  FileSpreadsheet,
  FileJson,
  FileCode,
} from 'lucide-react';

export interface SqlEditorHeaderProps {
  onExecute: () => void;
  onFormat: () => void;
  onExplain: (analyze: boolean) => void;
  onSave: () => void;
  onToggleHistory: () => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  onExportSql?: () => void;
  isExecuting: boolean;
  hasResults: boolean;
}

export const SqlEditorHeader: React.FC<SqlEditorHeaderProps> = ({
  onExecute,
  onFormat,
  onExplain,
  onSave,
  onToggleHistory,
  onExportCsv,
  onExportJson,
  onExportSql,
  isExecuting,
  hasResults,
}) => {
  const [showExplainMenu, setShowExplainMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#121318] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 flex-shrink-0 select-none">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onExecute}
          disabled={isExecuting}
          title="Run Query (Ctrl + Enter)"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Run</span>
          <span className="text-[10px] opacity-75 hidden sm:inline font-mono">Ctrl+↵</span>
        </button>

        <button
          type="button"
          onClick={onFormat}
          title="Format SQL (Ctrl+Shift+F)"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="hidden sm:inline">Format</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExplainMenu(!showExplainMenu)}
            title="Explain Query Execution Plan"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Explain</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showExplainMenu && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 z-50 text-xs text-slate-700 dark:text-zinc-200">
              <button
                type="button"
                onClick={() => {
                  setShowExplainMenu(false);
                  onExplain(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between"
              >
                <span>Explain Plan</span>
                <span className="text-[10px] text-zinc-500 font-mono">Alt+X</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExplainMenu(false);
                  onExplain(true);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between"
              >
                <span>Explain & Analyze</span>
                <span className="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+↵</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          title="Save Query (Ctrl + S)"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {hasResults && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export Query Results"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 z-50 text-xs text-slate-700 dark:text-zinc-200">
                {onExportCsv && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCsv();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>CSV</span>
                  </button>
                )}
                {onExportJson && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportJson();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <FileJson className="w-3.5 h-3.5 text-amber-500" />
                    <span>JSON</span>
                  </button>
                )}
                {onExportSql && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportSql();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                    <span>SQL Insert</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleHistory}
          title="Query History (Ctrl + H)"
          className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
        >
          <History className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
