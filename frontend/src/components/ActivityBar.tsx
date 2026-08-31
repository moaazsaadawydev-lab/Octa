import React from 'react';
import { Database, Globe, Layers, Settings, Flame } from 'lucide-react';

export type ActiveModule = 'databases' | 'http' | 'settings';

interface ActivityBarProps {
  activeModule: ActiveModule;
  setActiveModule: (mod: ActiveModule) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeModule, setActiveModule }) => {
  return (
    <div className="w-12 bg-surface-950 border-r border-[#262626] flex flex-col items-center py-3 select-none flex-shrink-0 z-20">
      {/* App Logo / Brand */}
      <div
        title="Octa Developer Hub"
        className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-5 text-brand-400 font-bold shadow-sm group hover:scale-105 transition-transform cursor-pointer"
      >
        <Flame className="w-5 h-5 text-brand-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
      </div>

      {/* Primary Workspace Nav Items */}
      <div className="flex flex-col gap-2 w-full items-center">
        {/* 1. Databases Workspace */}
        <button
          type="button"
          onClick={() => setActiveModule('databases')}
          title="Databases (Tables, SQL Playground, ERD) (Ctrl+1)"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeModule === 'databases'
              ? 'bg-surface-800 text-brand-400 font-medium shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-800/60'
          }`}
        >
          {activeModule === 'databases' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          <Database className="w-5 h-5" />
        </button>

        {/* 2. HTTP / API Client Workspace */}
        <button
          type="button"
          onClick={() => setActiveModule('http')}
          title="HTTP / API Client (Ctrl+2)"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeModule === 'http'
              ? 'bg-surface-800 text-brand-400 font-medium shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-800/60'
          }`}
        >
          {activeModule === 'http' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          <Globe className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Nav Items (Settings) */}
      <div className="mt-auto flex flex-col gap-2 w-full items-center">
        <button
          type="button"
          onClick={() => setActiveModule('settings')}
          title="Settings & About Octa (Ctrl+,)"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            activeModule === 'settings'
              ? 'bg-surface-800 text-brand-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-800/60'
          }`}
        >
          {activeModule === 'settings' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
