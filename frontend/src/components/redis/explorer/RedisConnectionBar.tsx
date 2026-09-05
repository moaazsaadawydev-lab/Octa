import React from 'react';
import {
  Layers,
  FolderTree,
  Terminal,
  Server,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { RedisConnectionConfig, RedisServerInfo } from '../types';

interface RedisConnectionBarProps {
  connections: RedisConnectionConfig[];
  activeConnId: string;
  onSelectConnId: (id: string) => void;
  activeDb: number;
  onSelectDb: (db: number) => void;
  isConnected: boolean;
  isConnecting: boolean;
  keysCount: number;
  workspaceMode: 'explorer' | 'workbench';
  onSelectWorkspaceMode: (mode: 'explorer' | 'workbench') => void;
  serverInfo: RedisServerInfo | null;
  onOpenServerInfo: () => void;
  onOpenNewKey: () => void;
  onOpenEditConn: () => void;
  onOpenFlushDb: () => void;
}

export const RedisConnectionBar: React.FC<RedisConnectionBarProps> = ({
  connections,
  activeConnId,
  onSelectConnId,
  activeDb,
  onSelectDb,
  isConnected,
  isConnecting,
  keysCount,
  workspaceMode,
  onSelectWorkspaceMode,
  serverInfo,
  onOpenServerInfo,
  onOpenNewKey,
  onOpenEditConn,
  onOpenFlushDb,
}) => {
  return (
    <div className="h-12 border-b border-slate-200 dark:border-[#242429] bg-white dark:bg-[#141418] px-4 flex items-center justify-between flex-shrink-0 z-20">
      {/* Left: Active Connection & DB Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <select
            value={activeConnId}
            onChange={(e) => onSelectConnId(e.target.value)}
            className="bg-slate-100 dark:bg-[#1b1b20] border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-zinc-100 outline-none hover:border-slate-400 dark:hover:border-zinc-500 transition-colors cursor-pointer"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.host}:{c.port})
              </option>
            ))}
          </select>
        </div>

        {/* Database Switcher (db0 - db15) */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1b1b20] border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2 py-0.5">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">DB:</span>
          <select
            value={activeDb}
            onChange={(e) => onSelectDb(parseInt(e.target.value) || 0)}
            className="bg-transparent text-xs font-mono font-bold text-blue-600 dark:text-blue-400 outline-none cursor-pointer"
          >
            {Array.from({ length: 16 }, (_, i) => (
              <option key={i} value={i} className="bg-white dark:bg-[#1b1b20] text-slate-800 dark:text-zinc-100">
                db{i}
              </option>
            ))}
          </select>
        </div>

        {/* Connection Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1b1b20] border border-slate-200 dark:border-zinc-800 text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-400 dark:bg-zinc-600'
            }`}
          />
          <span className="text-slate-700 dark:text-zinc-300 font-medium">
            {isConnecting ? 'Connecting...' : isConnected ? `Online (${keysCount} keys)` : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Center: Mode Switcher (Explorer vs Workbench) */}
      <div className="flex items-center bg-slate-100 dark:bg-[#18181d] border border-slate-200 dark:border-zinc-700/80 rounded-lg p-0.5 shadow-inner">
        <button
          type="button"
          onClick={() => onSelectWorkspaceMode('explorer')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            workspaceMode === 'explorer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Keys Explorer</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectWorkspaceMode('workbench')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            workspaceMode === 'workbench'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Workbench / CLI</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {serverInfo && (
          <button
            type="button"
            onClick={onOpenServerInfo}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 bg-slate-100 hover:bg-slate-200 dark:bg-[#1b1b20] dark:hover:bg-zinc-700/50 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
            title="Server Info"
          >
            <Server className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>v{serverInfo.redisVersion || 'unknown'}</span>
          </button>
        )}

        <button
          type="button"
          disabled={!isConnected}
          onClick={onOpenNewKey}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Key</span>
        </button>

        <button
          type="button"
          onClick={onOpenEditConn}
          className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Edit Connection Settings"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={!isConnected || keysCount === 0}
          onClick={onOpenFlushDb}
          className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Flush Current Database"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
