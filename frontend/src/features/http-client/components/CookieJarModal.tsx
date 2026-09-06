import React from 'react';
import { Cookie as CookieIcon, X, Trash2 } from 'lucide-react';
import { StoredCookie } from '../types';

export interface CookieJarModalProps {
  isOpen: boolean;
  onClose: () => void;
  cookieJar: StoredCookie[];
  saveCookieJar: (jar: StoredCookie[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CookieJarModal: React.FC<CookieJarModalProps> = ({
  isOpen,
  onClose,
  cookieJar,
  saveCookieJar,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-xl bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-[#0f141c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CookieIcon className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Cookie Jar</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/30 text-amber-300">
              {cookieJar.length} stored
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Cookies List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cookieJar.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              <CookieIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-60" />
              <span className="text-xs">No cookies in jar</span>
              <p className="text-[11px] text-zinc-600 mt-1">
                Cookies received via Set-Cookie response headers will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-zinc-800/80 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/60">
              {cookieJar.map((c, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-[#12161f] hover:bg-slate-50 dark:hover:bg-[#161c28] transition-colors flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-300">{c.name}</span>
                      <span className="text-zinc-400 dark:text-zinc-600">=</span>
                      <span className="font-mono text-slate-700 dark:text-zinc-300 truncate max-w-xs" title={c.value}>
                        {c.value}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                      <span>Domain: <strong className="text-slate-700 dark:text-zinc-400">{c.domain}</strong></span>
                      <span>Path: <strong className="text-slate-700 dark:text-zinc-400">{c.path}</strong></span>
                      {c.expires && (
                        <span>Expires: <strong className="text-slate-700 dark:text-zinc-400">{new Date(c.expires).toLocaleDateString()}</strong></span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = cookieJar.filter((_, i) => i !== idx);
                      saveCookieJar(next);
                      showToast('Removed cookie: ' + c.name, 'info');
                    }}
                    title="Delete cookie"
                    className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-[#0f141c] flex items-center justify-between">
          {cookieJar.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                saveCookieJar([]);
                showToast('Cookie jar cleared', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Cookies</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-[#1c2331] dark:hover:bg-[#232c3d] text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700/80 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
