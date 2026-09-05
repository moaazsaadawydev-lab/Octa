import React from 'react';
import { Globe, ChevronDown, Check, Sliders } from 'lucide-react';
import { Environment } from '../types';

export interface EnvironmentDropdownProps {
  environments: Environment[];
  activeEnvironment: Environment | null;
  activeEnvironmentId: string | null;
  onSelectEnvironment: (id: string | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onOpenManage: () => void;
}

export const EnvironmentDropdown: React.FC<EnvironmentDropdownProps> = ({
  environments,
  activeEnvironment,
  activeEnvironmentId,
  onSelectEnvironment,
  isOpen,
  setIsOpen,
  dropdownRef,
  onOpenManage,
}) => {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Select active environment or manage variables"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-500/30 transition-colors cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
        <span className="text-[11px] font-medium truncate max-w-[110px]">
          {activeEnvironment ? activeEnvironment.name : 'No Environment'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700/80 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans">
          <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Environments
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectEnvironment(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer ${
              activeEnvironmentId === null
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium'
                : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="truncate">No Environment</span>
            {activeEnvironmentId === null && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
          </button>
          {environments.map((env) => (
            <button
              key={env.id}
              type="button"
              onClick={() => {
                onSelectEnvironment(env.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                activeEnvironmentId === env.id
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate">{env.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  ({env.variables.filter((v) => v.enabled).length})
                </span>
              </div>
              {activeEnvironmentId === env.id && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
            </button>
          ))}
          <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenManage();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors text-left cursor-pointer font-medium"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span>Manage Environments...</span>
          </button>
        </div>
      )}
    </div>
  );
};
