import React, { useState, useEffect } from 'react';
import {
  Save,
  Trash2,
  RotateCcw,
  Cookie as CookieIcon,
  Shield,
  Clock,
} from 'lucide-react';
import { StoredCookie } from '../../types';
import { CookieEditorEmptyState } from './CookieEditorEmptyState';
import { CookieTokenTextarea } from './CookieTokenTextarea';

export interface CookieEditorPaneProps {
  cookie: StoredCookie | null;
  isNew?: boolean;
  onSave: (updated: StoredCookie) => void;
  onDelete: () => void;
  onCreateNew: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CookieEditorPane: React.FC<CookieEditorPaneProps> = ({
  cookie,
  isNew = false,
  onSave,
  onDelete,
  onCreateNew,
  showToast,
}) => {
  const [draft, setDraft] = useState<StoredCookie | null>(null);

  useEffect(() => {
    setDraft(cookie ? { ...cookie } : null);
  }, [cookie]);

  if (!draft) {
    return <CookieEditorEmptyState onCreateNew={onCreateNew} />;
  }

  const isDirty =
    !cookie ||
    draft.name !== cookie.name ||
    draft.value !== cookie.value ||
    draft.domain !== cookie.domain ||
    draft.path !== cookie.path ||
    draft.httpOnly !== cookie.httpOnly ||
    draft.secure !== cookie.secure;

  const handleSave = () => {
    if (!draft.name.trim()) {
      showToast('Cookie name is required', 'error');
      return;
    }
    if (!draft.domain.trim()) {
      showToast('Cookie domain is required', 'error');
      return;
    }
    onSave(draft);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0d1117]">
      {/* Editor Header Bar */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-[#0f141c] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <CookieIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">
                {draft.name || (isNew ? 'New Cookie' : 'Unnamed Cookie')}
              </span>
              {isDirty && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Unsaved
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              {draft.domain}{draft.path || '/'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cookie && isDirty && (
            <button
              type="button"
              onClick={() => setDraft({ ...cookie })}
              title="Revert changes"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {!isNew && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete cookie"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-900 dark:text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Cookie</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Name, Domain, Path Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
              Cookie Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. session_id, token, jwt"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#12161f] border border-slate-300 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
              Domain <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={draft.domain}
              onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
              placeholder="e.g. localhost, api.example.com"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#12161f] border border-slate-300 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
              Path
            </label>
            <input
              type="text"
              value={draft.path}
              onChange={(e) => setDraft({ ...draft, path: e.target.value })}
              placeholder="/"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#12161f] border border-slate-300 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
        </div>

        {/* Large Monospace Value / Token Workspace */}
        <CookieTokenTextarea
          value={draft.value}
          onChange={(val) => setDraft({ ...draft, value: val })}
          showToast={showToast}
        />

        {/* Security & Flags Row */}
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-6 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!draft.httpOnly}
              onChange={(e) => setDraft({ ...draft, httpOnly: e.target.checked })}
              className="rounded bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-medium">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>HttpOnly</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:inline">
              (Inaccessible to script)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!draft.secure}
              onChange={(e) => setDraft({ ...draft, secure: e.target.checked })}
              className="rounded bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secure</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:inline">
              (HTTPS only)
            </span>
          </label>

          {draft.expires && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 font-mono ml-auto">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Expires: {new Date(draft.expires).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
