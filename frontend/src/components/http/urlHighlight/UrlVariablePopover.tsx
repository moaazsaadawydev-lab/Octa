import React from 'react';
import { Globe, Key, Sparkles, AlertCircle, ArrowUpRight, X } from 'lucide-react';
import { Environment } from '../../../types/environments';
import { VariableToken } from './types';

interface UrlVariablePopoverProps {
  token: VariableToken;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  popoverLeft: number;
  editValue: string;
  activeEnv: Environment | null;
  onClose: () => void;
  onEditChange: (val: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpenManageEnvironments?: (scopeId?: string) => void;
}

export const UrlVariablePopover: React.FC<UrlVariablePopoverProps> = ({
  token,
  popoverRef,
  popoverLeft,
  editValue,
  activeEnv,
  onClose,
  onEditChange,
  onMouseEnter,
  onMouseLeave,
  onOpenManageEnvironments,
}) => {
  return (
    <div
      ref={popoverRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ left: `${Math.min(Math.max(8, popoverLeft), 400)}px` }}
      className="absolute top-full mt-2 w-80 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700/80 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100 font-sans"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-zinc-800/80">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 truncate">
            &#123;&#123;{token.rawKey}&#125;&#125;
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Popover Body: Value Editor */}
      {token.source === 'macro' ? (
        <div className="space-y-2 py-1">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
            Generated dynamic macro value:
          </div>
          <div className="p-2 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-amber-700 dark:text-amber-300 select-all break-all">
            {token.value}
          </div>
        </div>
      ) : (
        <div className="space-y-2 py-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400 font-medium">Value:</span>
            {token.resolved && (
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                {editValue.length} chars
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={editValue}
              autoFocus
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                  onClose();
                }
              }}
              placeholder="Enter variable value..."
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-700/80 focus:border-sky-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all shadow-inner"
            />
          </div>

          {editValue.trim() === '' && (
            <div className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium pt-0.5">
              <AlertCircle className="w-3 h-3" />
              <span>Value is empty (token renders in Red)</span>
            </div>
          )}
        </div>
      )}

      {/* Popover Footer: Scope Bar & Edit Link */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-zinc-800/80 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 truncate">
          {token.resolved ? (
            token.source === 'macro' ? (
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            ) : token.source === 'global' ? (
              <Key className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            )
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
          )}
          <span className="truncate font-medium text-slate-700 dark:text-zinc-300">
            {token.scope || 'Unresolved Scope'}
          </span>
        </div>

        {token.source !== 'macro' && (
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenManageEnvironments) {
                onOpenManageEnvironments(
                  token.source === 'global' ? 'globals' : (activeEnv?.id || 'globals')
                );
              }
            }}
            className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-medium hover:underline transition-colors flex-shrink-0 cursor-pointer ml-2"
          >
            <span>Edit in Environment</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
