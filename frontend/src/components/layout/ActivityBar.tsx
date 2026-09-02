import React from 'react';
import { Database, Globe, Layers, Settings, Terminal } from 'lucide-react';
import appIcon from '../../assets/appicon.png';

export type ActiveModule = 'welcome' | 'databases' | 'redis' | 'http' | 'terminal' | 'settings';

interface ActivityBarProps {
  activeModule: ActiveModule;
  setActiveModule: (mod: ActiveModule) => void;
  hasProject?: boolean;
  onOpenSettings?: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeModule,
  setActiveModule,
  hasProject = false,
  onOpenSettings,
}) => {
  return (
    <div className="w-12 bg-slate-100 dark:bg-[#08090c] border-r border-slate-200 dark:border-zinc-800 flex flex-col items-center py-3 select-none flex-shrink-0 z-20 transition-colors">
      {/* App Logo / Brand */}
      <div
        onClick={() => setActiveModule('welcome')}
        title="Welcome Screen"
        className={`w-8 h-8 rounded-lg bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center mb-5 p-1 shadow-sm group hover:scale-105 transition-transform cursor-pointer ${activeModule === 'welcome' ? 'ring-2 ring-brand-500 dark:ring-brand-400' : ''
          }`}
      >
        <img src={appIcon} alt="Octa" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
      </div>

      {/* Primary Workspace Nav Items */}
      <div className="flex flex-col gap-2 w-full items-center">
        {/* 1. Databases Workspace */}
        <button
          type="button"
          disabled={!hasProject}
          onClick={() => setActiveModule('databases')}
          title={hasProject ? "Databases (Tables, SQL Playground, ERD) (Ctrl+1)" : "Open a project to use Databases"}
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${!hasProject
              ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-zinc-600'
              : activeModule === 'databases'
                ? 'bg-slate-200 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 font-medium shadow-sm cursor-pointer'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 cursor-pointer'
            }`}
        >
          {hasProject && activeModule === 'databases' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 dark:bg-brand-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          <Database className="w-5 h-5" />
        </button>

        {/* 2. Redis Cache Explorer Workspace */}
        <button
          type="button"
          disabled={!hasProject}
          onClick={() => setActiveModule('redis')}
          title={hasProject ? "Redis / Cache Explorer (Ctrl+2)" : "Open a project to use Redis Explorer"}
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${!hasProject
              ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-zinc-600'
              : activeModule === 'redis'
                ? 'bg-slate-200 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 font-medium shadow-sm cursor-pointer'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 cursor-pointer'
            }`}
        >
          {hasProject && activeModule === 'redis' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 dark:bg-brand-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          <Layers className="w-5 h-5" />
        </button>

        {/* 3. HTTP / API Client Workspace */}
        <button
          type="button"
          disabled={!hasProject}
          onClick={() => setActiveModule('http')}
          title={hasProject ? "HTTP / API Client (Ctrl+3)" : "Open a project to use HTTP Client"}
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${!hasProject
              ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-zinc-600'
              : activeModule === 'http'
                ? 'bg-slate-200 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 font-medium shadow-sm cursor-pointer'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 cursor-pointer'
            }`}
        >
          {hasProject && activeModule === 'http' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 dark:bg-brand-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          <Globe className="w-5 h-5" />
        </button>

        {/* 4. Terminal Workspace */}
        <button
          type="button"
          disabled={!hasProject}
          onClick={() => setActiveModule('terminal')}
          title={hasProject ? "Terminal / PowerShell (Ctrl+4)" : "Open a project to use Terminal"}
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${!hasProject
              ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-zinc-600'
              : activeModule === 'terminal'
                ? 'bg-slate-200 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 font-medium shadow-sm cursor-pointer'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 cursor-pointer'
            }`}
        >
          {hasProject && activeModule === 'terminal' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 dark:bg-brand-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          <Terminal className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Nav Items (Settings) */}
      <div className="mt-auto flex flex-col gap-2 w-full items-center">
        <button
          type="button"
          onClick={() => {
            if (onOpenSettings) {
              onOpenSettings();
            } else {
              setActiveModule('settings');
            }
          }}
          title="Preferences / Settings (Ctrl+,)"
          className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
