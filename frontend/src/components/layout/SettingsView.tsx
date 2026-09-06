import React from 'react';
import {
  Settings,
  Flame,
  Database,
  Globe,
  Layers,
  Zap,
  Terminal,
  FileCode,
  Shield,
  Trash2,
  ExternalLink,
  Cpu,
  Keyboard
} from 'lucide-react';

interface SettingsViewProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

import { NAVIGATION_SHORTCUTS } from '../../constants/shortcuts';

export const SettingsView: React.FC<SettingsViewProps> = ({ showToast }) => {
  const handleClearCache = () => {
    localStorage.removeItem('octa_query_history');
    showToast('Application cache and query history cleared', 'success');
  };

  const SHORTCUTS = NAVIGATION_SHORTCUTS.map((s) => ({
    key: s.keys.join(' + '),
    desc: s.label,
  }));

  return (
    <div className="flex-1 h-full bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-y-auto p-8 select-none font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Branding Card */}
        <div className="p-6 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800/80 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-500 dark:text-brand-400 shadow-lg shadow-brand-500/10">
              <Flame className="w-8 h-8 text-brand-500 dark:text-brand-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Octa</h1>
                <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-500/40 text-brand-600 dark:text-brand-300 font-mono text-[11px] font-semibold">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Modular All-in-One Developer Hub & Database Workspace
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 dark:text-zinc-500 font-mono">
            <div>Engine: Go + Wails v2</div>
            <div>UI: React 19 + TypeScript + Tailwind</div>
          </div>
        </div>

        {/* Workspace Modules Overview */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-mono">
            Enabled Modules & Workspaces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-[#12161f] border border-slate-200 dark:border-zinc-800/70 hover:border-slate-300 dark:hover:border-zinc-700/80 rounded-xl space-y-2 transition-colors">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
                <Database className="w-4 h-4" />
                <span>Databases</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                PostgreSQL schema explorer, inline cell editor, SQL playground, and SQL dump export/import.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-[#12161f] border border-slate-200 dark:border-zinc-800/70 hover:border-slate-300 dark:hover:border-zinc-700/80 rounded-xl space-y-2 transition-colors">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold text-sm">
                <Globe className="w-4 h-4" />
                <span>HTTP / API Client</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Fast REST API client with query params, headers, JSON body formatting, and response inspector.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-[#12161f] border border-slate-200 dark:border-zinc-800/70 hover:border-slate-300 dark:hover:border-zinc-700/80 rounded-xl space-y-2 transition-colors">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <Layers className="w-4 h-4" />
                <span>Visual ERD</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Node-based schema diagram visualizer with foreign key relationships and auto-layout.
              </p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="p-5 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800/80 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-mono">
            <Keyboard className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            <span>Keyboard Shortcuts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#12161f] border border-slate-200 dark:border-zinc-800/70"
              >
                <span className="text-slate-700 dark:text-zinc-300 font-medium">{item.desc}</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 font-mono text-[11px] font-semibold shadow-xs">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Storage & Privacy Controls */}
        <div className="p-5 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800/80 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-mono">
            <Shield className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            <span>Storage & Cache</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Connection configurations are encrypted and stored locally in your system configuration directory.
          </p>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Clear temporary query history and editor tabs
            </span>
            <button
              type="button"
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
