import React, { useState } from 'react';
import { Clock, Trash2, Save, Loader2, Copy, Check } from 'lucide-react';
import { RedisTab, formatBytes } from '../types';
import { KeyTypeBadge } from './KeyTypeBadge';

interface KeyDetailHeaderProps {
  activeTab: RedisTab;
  isSaving: boolean;
  onSave: () => void;
  onDelete: (key: string) => void;
  onUpdateTTL: (ttl: number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const KeyDetailHeader: React.FC<KeyDetailHeaderProps> = ({
  activeTab,
  isSaving,
  onSave,
  onDelete,
  onUpdateTTL,
  showToast,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingTTL, setIsEditingTTL] = useState(false);
  const [customTTLInput, setCustomTTLInput] = useState('');

  const handleCopyKey = () => {
    navigator.clipboard.writeText(activeTab.key);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    showToast('Copied key name to clipboard', 'info');
  };

  const handleSetCustomTTL = () => {
    const val = parseInt(customTTLInput);
    if (!isNaN(val)) {
      onUpdateTTL(val);
      setIsEditingTTL(false);
    }
  };

  return (
    <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#141418] flex-shrink-0">
      {/* Left: Key name, type badge, memory */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold font-mono text-slate-800 dark:text-zinc-200 truncate max-w-md">
              {activeTab.key}
            </h2>
            <button
              type="button"
              onClick={handleCopyKey}
              className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Copy Key Name"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <KeyTypeBadge type={activeTab.type} />
            {activeTab.detail && (
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                Size: {formatBytes(activeTab.detail.memoryUsage)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: TTL Editor & Actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsEditingTTL(!isEditingTTL)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 hover:border-slate-400 dark:hover:border-zinc-500 text-xs font-mono text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>
              TTL:{' '}
              {activeTab.detail?.ttl === -1 || activeTab.detail?.ttl === undefined
                ? 'Persistent (-1)'
                : activeTab.detail.ttl === -2
                ? 'Expired'
                : `${activeTab.detail.ttl}s`}
            </span>
          </button>

          {isEditingTTL && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl p-2 z-50 space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-400 px-1">
                Set Expiration
              </div>
              <button
                type="button"
                onClick={() => {
                  onUpdateTTL(-1);
                  setIsEditingTTL(false);
                }}
                className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Persistent (-1)
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateTTL(60);
                  setIsEditingTTL(false);
                }}
                className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                1 Minute (60s)
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateTTL(3600);
                  setIsEditingTTL(false);
                }}
                className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                1 Hour (3600s)
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateTTL(86400);
                  setIsEditingTTL(false);
                }}
                className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                1 Day (86400s)
              </button>
              <div className="flex gap-1 pt-1 border-t border-slate-200 dark:border-zinc-800">
                <input
                  type="number"
                  value={customTTLInput}
                  onChange={(e) => setCustomTTLInput(e.target.value)}
                  placeholder="Secs"
                  className="w-full px-2 py-0.5 bg-slate-100 dark:bg-[#121215] border border-slate-200 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-zinc-100 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={handleSetCustomTTL}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(activeTab.key)}
          className="p-2 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Delete Key"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
