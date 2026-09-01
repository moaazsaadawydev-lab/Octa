import React from 'react';
import { Flame, Database, Layers, Globe, Settings } from 'lucide-react';
import { ActiveSession } from '../types/connection';
import { ActiveModule } from './ActivityBar';

interface TitleBarProps {
  activeModule: ActiveModule;
  activeSession: ActiveSession | null;
}

export const TitleBar: React.FC<TitleBarProps> = ({ activeModule, activeSession }) => {
  return (
    <div
      style={{ '--wails-draggable': 'drag' } as any}
      className="h-8 bg-[#0c0c0c] border-b border-[#222222] flex items-center justify-between px-3 select-none flex-shrink-0 z-50 text-xs"
    >
      {/* Left Brand & App Identity */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-brand-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]" />
          <span className="font-semibold text-zinc-200 text-xs tracking-tight">Octa</span>
        </div>
        <span className="text-zinc-600">/</span>
        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
          {activeModule === 'databases' && (
            <>
              <Database className="w-3 h-3 text-zinc-500" />
              <span>Databases</span>
            </>
          )}
          {activeModule === 'redis' && (
            <>
              <Layers className="w-3 h-3 text-zinc-500" />
              <span>Redis Cache Explorer</span>
            </>
          )}
          {activeModule === 'http' && (
            <>
              <Globe className="w-3 h-3 text-zinc-500" />
              <span>HTTP / API Client</span>
            </>
          )}
          {activeModule === 'settings' && (
            <>
              <Settings className="w-3 h-3 text-zinc-500" />
              <span>Settings</span>
            </>
          )}
        </span>
      </div>

      {/* Center Context / Active Database Breadcrumb */}
      {activeSession && (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="text-zinc-500 font-mono text-[10px]">
            {activeSession.connection.host}:{activeSession.connection.port}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-emerald-400 font-medium">{activeSession.activeDatabase}</span>
        </div>
      )}

      {/* Right subtle version badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Octa v1.0</span>
        </div>
      </div>
    </div>
  );
};
