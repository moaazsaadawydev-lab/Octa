import React, { useState } from 'react';
import { Columns, AlignLeft, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { GitFileChange } from '../../types/git';

interface GitDiffViewerProps {
  filePath: string | null;
  fileChange: GitFileChange | null;
  diffContent: string;
  isLoading: boolean;
}

interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'hunk' | 'header';
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

interface SplitDiffRow {
  oldLine?: { number: number; text: string; type: 'delete' | 'context' };
  newLine?: { number: number; text: string; type: 'add' | 'context' };
  hunkHeader?: string;
}

function parseUnifiedDiff(rawDiff: string): DiffLine[] {
  if (!rawDiff) return [];
  const lines = rawDiff.split('\n');
  const result: DiffLine[] = [];

  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      result.push({ type: 'header', text: line });
    } else if (line.startsWith('@@')) {
      // Hunk header e.g. @@ -1,5 +1,6 @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'hunk', text: line });
    } else if (line.startsWith('+')) {
      result.push({
        type: 'add',
        newLineNumber: newLine,
        text: line.slice(1),
      });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({
        type: 'delete',
        oldLineNumber: oldLine,
        text: line.slice(1),
      });
      oldLine++;
    } else {
      // Context unchanged line (or empty)
      const text = line.startsWith(' ') ? line.slice(1) : line;
      result.push({
        type: 'context',
        oldLineNumber: oldLine > 0 ? oldLine : undefined,
        newLineNumber: newLine > 0 ? newLine : undefined,
        text: text,
      });
      if (oldLine > 0) oldLine++;
      if (newLine > 0) newLine++;
    }
  }

  return result;
}

function buildSplitDiff(lines: DiffLine[]): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'header') {
      i++;
      continue;
    }

    if (line.type === 'hunk') {
      rows.push({ hunkHeader: line.text });
      i++;
      continue;
    }

    if (line.type === 'context') {
      rows.push({
        oldLine: { number: line.oldLineNumber || 0, text: line.text, type: 'context' },
        newLine: { number: line.newLineNumber || 0, text: line.text, type: 'context' },
      });
      i++;
      continue;
    }

    if (line.type === 'delete') {
      // Check if followed by an add
      const next = lines[i + 1];
      if (next && next.type === 'add') {
        rows.push({
          oldLine: { number: line.oldLineNumber || 0, text: line.text, type: 'delete' },
          newLine: { number: next.newLineNumber || 0, text: next.text, type: 'add' },
        });
        i += 2;
        continue;
      } else {
        rows.push({
          oldLine: { number: line.oldLineNumber || 0, text: line.text, type: 'delete' },
        });
        i++;
        continue;
      }
    }

    if (line.type === 'add') {
      rows.push({
        newLine: { number: line.newLineNumber || 0, text: line.text, type: 'add' },
      });
      i++;
      continue;
    }

    i++;
  }

  return rows;
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
          /* UNIFIED DIFF VIEW */
          <div className="divide-y divide-zinc-900/50 min-w-full">
            {parsedLines.map((line, idx) => {
              if (line.type === 'header') {
                return (
                  <div key={idx} className="px-4 py-1 text-zinc-600 bg-zinc-950/80 select-none text-[11px]">
                    {line.text}
                  </div>
                );
              }
              if (line.type === 'hunk') {
                return (
                  <div key={idx} className="px-4 py-1.5 text-sky-400/80 bg-sky-950/20 font-semibold select-none">
                    {line.text}
                  </div>
                );
              }

              const isAdd = line.type === 'add';
              const isDelete = line.type === 'delete';

              return (
                <div
                  key={idx}
                  className={clsx(
                    'flex items-stretch leading-relaxed hover:brightness-110 transition-colors',
                    isAdd && 'bg-emerald-950/35 text-emerald-300',
                    isDelete && 'bg-rose-950/35 text-rose-300',
                    !isAdd && !isDelete && 'text-zinc-300'
                  )}
                >
                  {/* Line Numbers Gutter */}
                  <div className="flex select-none flex-shrink-0 text-zinc-600 font-mono text-[11px] text-right bg-zinc-950/60 border-r border-zinc-800/60">
                    <span className="w-10 px-2 py-0.5">{line.oldLineNumber || ''}</span>
                    <span className="w-10 px-2 py-0.5 border-l border-zinc-900">{line.newLineNumber || ''}</span>
                  </div>

                  {/* Marker +/- */}
                  <div className="w-6 flex items-center justify-center font-bold select-none flex-shrink-0 opacity-70">
                    {isAdd ? '+' : isDelete ? '-' : ' '}
                  </div>

                  {/* Line Content */}
                  <div className="flex-1 px-2 py-0.5 whitespace-pre font-mono">
                    {line.text || ' '}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* SPLIT / SIDE-BY-SIDE DIFF VIEW */
          <div className="divide-y divide-zinc-900/50 min-w-full">
            {splitRows.map((row, idx) => {
              if (row.hunkHeader) {
                return (
                  <div key={idx} className="px-4 py-1.5 text-sky-400/80 bg-sky-950/20 font-semibold select-none">
                    {row.hunkHeader}
                  </div>
                );
              }

              const isOldDelete = row.oldLine?.type === 'delete';
              const isNewAdd = row.newLine?.type === 'add';

              return (
                <div key={idx} className="flex divide-x divide-zinc-800/80 leading-relaxed min-w-full">
                  {/* Left (Old / Deletion Side) */}
                  <div
                    className={clsx(
                      'flex-1 flex min-w-0',
                      isOldDelete ? 'bg-rose-950/35 text-rose-300' : 'text-zinc-400'
                    )}
                  >
                    <div className="w-10 px-2 py-0.5 text-right text-zinc-600 select-none bg-zinc-950/60 border-r border-zinc-800/60 text-[11px]">
                      {row.oldLine?.number || ''}
                    </div>
                    <div className="w-5 text-center font-bold select-none opacity-70">
                      {isOldDelete ? '-' : ' '}
                    </div>
                    <div className="flex-1 px-2 py-0.5 whitespace-pre font-mono overflow-hidden truncate">
                      {row.oldLine?.text || ' '}
                    </div>
                  </div>

                  {/* Right (New / Addition Side) */}
                  <div
                    className={clsx(
                      'flex-1 flex min-w-0',
                      isNewAdd ? 'bg-emerald-950/35 text-emerald-300' : 'text-zinc-300'
                    )}
                  >
                    <div className="w-10 px-2 py-0.5 text-right text-zinc-600 select-none bg-zinc-950/60 border-r border-zinc-800/60 text-[11px]">
                      {row.newLine?.number || ''}
                    </div>
                    <div className="w-5 text-center font-bold select-none opacity-70">
                      {isNewAdd ? '+' : ' '}
                    </div>
                    <div className="flex-1 px-2 py-0.5 whitespace-pre font-mono overflow-hidden truncate">
                      {row.newLine?.text || ' '}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
