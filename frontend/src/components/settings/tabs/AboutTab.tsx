import React from 'react';
import { ExternalLink, Shield } from 'lucide-react';
import appIcon from '../../../assets/appicon.png';

export const AboutTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="p-6 bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center p-2 shadow-sm">
            <img
              src={appIcon}
              alt="Octa"
              className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Octa
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800/80 text-brand-600 dark:text-brand-400 font-mono text-[10px] font-semibold">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Modular All-in-One Developer Hub & Database Workspace
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-400 dark:text-zinc-500 font-mono space-y-0.5">
          <div>Engine: Go + Wails v2</div>
          <div>UI: React 19 + TypeScript</div>
        </div>
      </div>

      {/* System Specifications */}
      <div className="p-4 bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
          <Shield className="w-4 h-4 text-brand-500" />
          <span>Security & Local Storage</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          Octa operates locally on your machine. All connection strings, credentials, and query data
          remain completely offline and are persisted strictly within your user configuration directory.
        </p>
      </div>

      {/* Links & License */}
      <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-zinc-400">
        <span>License: MIT &copy; 2026 Octa Team</span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-brand-500 transition-colors"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
