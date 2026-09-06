import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Terminal,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';
import clsx from 'clsx';
import { TerminalCommandBlock } from '../../types/terminalHistory';

interface TerminalContextPickerProps {
  blocks: TerminalCommandBlock[];
  selectedIds: Set<string>;
  isExplaining: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExplainSelected: () => void;
}

export const TerminalContextPicker: React.FC<TerminalContextPickerProps> = ({
  blocks,
  selectedIds,
  isExplaining,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onExplainSelected,
}) => {
  // Display blocks in reverse chronological order (newest first)
  const orderedBlocks = [...blocks].reverse();
  const selectedCount = selectedIds.size;
  const allSelected = blocks.length > 0 && selectedCount === blocks.length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50/50 dark:bg-[#0c0d12]/40">
      {/* Informative Guidance Sub-Header */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0e1017]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-zinc-200">
            Select Commands for AI Diagnosis
          </span>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            {selectedCount} of {blocks.length} selected
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
          Choose the commands and error traces to include in Gemini&apos;s analysis.
        </p>
      </div>

      {/* Scrollable Command List */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-2 no-scrollbar">
        {orderedBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-500 dark:text-zinc-400">
            <Terminal className="w-8 h-8 text-slate-300 dark:text-zinc-700 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-300">
              No executed commands detected
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-[240px]">
              Run commands in your terminal session to populate diagnostic history.
            </p>
          </div>
        ) : (
          orderedBlocks.map((block) => {
            const isSelected = selectedIds.has(block.id);
            const isFailed = block.exitCode && block.exitCode !== 0;

            return (
              <div
                key={block.id}
                onClick={() => onToggleSelect(block.id)}
                className={clsx(
                  'group relative p-3 rounded-xl border transition-all cursor-pointer select-none text-left',
                  isSelected
                    ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800/70 shadow-xs'
                    : 'bg-white dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Custom Checkbox */}
                  <div className="pt-0.5 text-purple-600 dark:text-purple-400 flex-shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 fill-purple-600 text-white dark:fill-purple-500 dark:text-zinc-900" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors" />
                    )}
                  </div>

                  {/* Command & Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-purple-500 dark:text-purple-400 font-mono text-xs font-bold select-none">
                          $
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                          {block.command}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {isFailed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-semibold flex-shrink-0">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      )}
                    </div>

                    {/* Output Snippet Preview */}
                    {block.output ? (
                      <div className="mt-1.5 p-2 rounded-lg bg-slate-900 text-zinc-300 font-mono text-[10.5px] leading-relaxed max-h-16 overflow-hidden text-ellipsis line-clamp-2 select-text border border-zinc-800">
                        {block.output}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 italic mt-0.5">
                        (No output recorded)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d12]/90 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          {allSelected ? (
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          ) : (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Select All
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={selectedCount === 0 || isExplaining}
          onClick={onExplainSelected}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer',
            selectedCount > 0 && !isExplaining
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
              : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
          )}
        >
          {isExplaining ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Explain Selected ({selectedCount})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
