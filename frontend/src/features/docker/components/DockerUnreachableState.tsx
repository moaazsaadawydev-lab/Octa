import React from 'react';
import { AlertTriangle, RefreshCw, Power, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useDockerEngineLauncher } from '../hooks/useDockerEngineLauncher';
import { DockerEngineProvider } from '../../../types/docker';

interface DockerUnreachableStateProps {
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  dockerError?: string | null;
  activeEngine?: 'windows' | 'wsl' | string;
  activeDistro?: string;
  availableEngines?: DockerEngineProvider[];
  onSwitchEngine?: (engineId: 'windows' | 'wsl') => void;
}

export const DockerUnreachableState: React.FC<DockerUnreachableStateProps> = ({
  onRefresh,
  isRefreshing,
  dockerError,
  activeEngine = 'windows',
  activeDistro,
  availableEngines,
  onSwitchEngine,
}) => {
  const { isStarting, error: launcherError, startEngine } = useDockerEngineLauncher({
    onSuccess: onRefresh,
    activeEngine,
    activeDistro,
  });

  const activeError = launcherError || dockerError;
  const isWSL = activeEngine === 'wsl';
  const startButtonLabel = isStarting
    ? 'Starting Docker Engine...'
    : isWSL
    ? `Start WSL2 (${activeDistro || 'Linux'})`
    : 'Start Docker Desktop';

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-[#090a0f] transition-colors">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 shadow-sm">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">
        Docker Daemon Not Reachable
      </h2>

      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm leading-relaxed">
        {isWSL
          ? `Octa could not connect to Docker in WSL2 (tcp://127.0.0.1:2375). Make sure Docker is running inside your ${activeDistro || 'Linux'} distro.`
          : 'Octa could not communicate with Docker Desktop. Please ensure Docker Desktop or the Windows daemon service is started.'}
      </p>

      {/* Engine Switcher Selector (if multiple engines exist) */}
      {availableEngines && availableEngines.length > 1 && onSwitchEngine && (
        <div className="mt-4 flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          {availableEngines.map((eng) => (
            <button
              key={eng.id}
              type="button"
              disabled={isStarting || isRefreshing}
              onClick={() => onSwitchEngine(eng.id as 'windows' | 'wsl')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
                activeEngine === eng.id
                  ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              )}
            >
              {eng.label}
            </button>
          ))}
        </div>
      )}

      {/* Primary & Secondary Action Buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={startEngine}
          disabled={isStarting || isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium text-xs shadow-sm transition-all ${
            isStarting || isRefreshing
              ? 'bg-emerald-600/70 dark:bg-emerald-700/60 cursor-not-allowed opacity-80'
              : 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 cursor-pointer active:scale-95'
          }`}
          title={isStarting ? 'Starting engine in background...' : 'Launch Docker Engine'}
        >
          {isStarting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{startButtonLabel}</span>
            </>
          ) : (
            <>
              <Power className="w-3.5 h-3.5" />
              <span>{startButtonLabel}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onRefresh()}
          disabled={isStarting || isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-medium text-xs shadow-sm transition-all ${
            isStarting || isRefreshing
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer active:scale-95'
          }`}
          title="Manually test Docker connection"
        >
          <RefreshCw className={isRefreshing ? 'w-3.5 h-3.5 animate-spin text-brand-500' : 'w-3.5 h-3.5'} />
          <span>Refresh Connection</span>
        </button>
      </div>

      {/* Error or Timeout Alert Banner */}
      {activeError && (
        <div className="mt-4 px-3.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 font-mono text-[11px] max-w-md break-words shadow-sm">
          {activeError}
        </div>
      )}
    </div>
  );
};
