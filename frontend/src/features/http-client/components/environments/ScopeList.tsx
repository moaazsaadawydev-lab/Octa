import React from 'react';
import { Globe, Plus, Key, Copy, Trash2 } from 'lucide-react';
import { Environment } from '../../types';

export interface ScopeListProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  selectedEnvIdInModal: string | 'globals';
  globalVariablesCount: number;
  onSelectScope: (id: string | 'globals') => void;
  onCreateEnvironment: () => void;
  onDuplicateEnvironment: (id: string) => void;
  onDeleteEnvironment: (id: string) => void;
}

export const ScopeList: React.FC<ScopeListProps> = ({
  environments,
  activeEnvironmentId,
  selectedEnvIdInModal,
  globalVariablesCount,
  onSelectScope,
  onCreateEnvironment,
  onDuplicateEnvironment,
  onDeleteEnvironment,
}) => {
  return (
    <div className="w-64 border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#121214] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Scopes</span>
        <button
          type="button"
          onClick={onCreateEnvironment}
          className="flex items-center gap-1 px-2 py-1 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 hover:text-brand-300 border border-brand-500/30 text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>New</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          type="button"
          onClick={() => onSelectScope('globals')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
            selectedEnvIdInModal === 'globals'
              ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-zinc-700'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-850'
          }`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Globals</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">
            {globalVariablesCount}
          </span>
        </button>

        <div className="h-px bg-slate-200 dark:bg-zinc-800/80 my-1.5" />

        {environments.map((env) => {
          const isSelected = selectedEnvIdInModal === env.id;
          const isActive = activeEnvironmentId === env.id;
          return (
            <div
              key={env.id}
              onClick={() => onSelectScope(env.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-zinc-700'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-850'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Globe className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span className="truncate">{env.name}</span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  title="Duplicate Environment"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateEnvironment(env.id);
                  }}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Delete Environment"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEnvironment(env.id);
                  }}
                  className="p-1 rounded hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
