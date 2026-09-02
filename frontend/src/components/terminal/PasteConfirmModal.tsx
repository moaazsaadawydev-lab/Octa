import React, { useEffect, useMemo } from 'react';
import { AlertTriangle, X, Check, FileText } from 'lucide-react';
import clsx from 'clsx';

interface PasteConfirmModalProps {
  isOpen: boolean;
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PasteConfirmModal: React.FC<PasteConfirmModalProps> = ({
  isOpen,
  text,
  onConfirm,
  onCancel,
}) => {
  // Compute line count & character count
  const lines = useMemo(() => text.split(/\r?\n/), [text]);
  const lineCount = lines.length;
  const charCount = text.length;

  // Keyboard navigation (Enter to confirm, Escape to cancel)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#12131a] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                Confirm Multi-Line Paste
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Commands may execute automatically upon pasting
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col min-h-0 space-y-3">
          {/* Metadata Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
              <FileText className="w-3.5 h-3.5" />
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono text-[11px]">
              {charCount} characters
            </span>
          </div>

          {/* Snippet Preview */}
          <div className="flex-1 min-h-[120px] max-h-[260px] overflow-y-auto rounded-xl bg-slate-900 dark:bg-[#08090d] border border-slate-800 dark:border-zinc-800/80 p-3 font-mono text-xs text-slate-200 shadow-inner select-text">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="pr-3 text-right select-none text-slate-600 dark:text-zinc-600 w-8 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre-wrap break-all text-slate-200 dark:text-zinc-200 font-mono leading-relaxed">
                      {line || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Paste Anyway (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
