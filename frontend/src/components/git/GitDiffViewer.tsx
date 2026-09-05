import React, { useState } from 'react';
import { Columns, AlignLeft, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { GitFileChange } from '../../types/git';
import { parseUnifiedDiff, buildSplitDiff } from './diffParser';
import { UnifiedDiffView } from './UnifiedDiffView';
import { SplitDiffView } from './SplitDiffView';

interface GitDiffViewerProps {
  filePath: string | null;
  fileChange: GitFileChange | null;
  diffContent: string;
  isLoading: boolean;
}

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({
  filePath,
  fileChange,
  diffContent,
  isLoading,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  if (!filePath) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50/50 dark:bg-[#090a0f]">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-slate-400 dark:text-zinc-400 shadow-sm">
          <FileText className="w-6 h-6 text-brand-500 dark:text-brand-400" />
        </div>
        <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
          No File Selected
        </span>
        <span className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Select a changed or staged file from the left sidebar to inspect its line-by-line diff.
        </span>
      </div>
    );
  }

  const parsedLines = parseUnifiedDiff(diffContent);
  const splitRows = viewMode === 'split' ? buildSplitDiff(parsedLines) : [];

  const getStatusBadge = () => {
    if (!fileChange) return null;
    const s = fileChange.status;
    if (s === 'modified') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
          Modified
        </span>
      );
    }
    if (s === 'added' || s === 'untracked') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
          {s === 'untracked' ? 'Untracked' : 'Added'}
        </span>
      );
    }
    if (s === 'deleted') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase">
          Deleted
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 bg-[#090a0f] text-zinc-100 overflow-hidden font-sans select-none relative">
      {/* 1. Header Toolbar */}
      <div className="p-3 bg-white dark:bg-[#0c0d12] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4 flex-shrink-0 select-none transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
            {filePath}
          </span>
          {getStatusBadge()}
          {fileChange?.staged && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase">
              Staged
            </span>
          )}
          {isLoading && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-sans bg-zinc-900 border border-zinc-800">
              <Loader2 className="w-3 h-3 animate-spin text-brand-500" />
              <span>Updating...</span>
            </span>
          )}
        </div>

        {/* View Mode Switcher: Unified vs Split */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode('unified')}
            title="Unified Diff View"
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              viewMode === 'unified'
                ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            )}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Unified</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            title="Split / Side-by-Side Diff View"
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              viewMode === 'split'
                ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            )}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
        </div>
      </div>

      {/* 2. Diff Viewport */}
      <div className="flex-1 w-full h-full min-h-0 min-w-0 bg-[#090a0f] overflow-auto font-mono text-xs select-text">
        {isLoading && !diffContent ? (
          <div className="flex items-center justify-center p-12 text-zinc-500 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>Loading diff...</span>
          </div>
        ) : parsedLines.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-zinc-500 text-xs">
            {isLoading ? 'Updating diff...' : 'No line changes detected in this file.'}
          </div>
        ) : viewMode === 'unified' ? (
          <UnifiedDiffView lines={parsedLines} />
        ) : (
          <SplitDiffView rows={splitRows} />
        )}
      </div>
    </div>
  );
};
