import React, { useState } from 'react';
import { Boxes, RefreshCw, CheckCircle2, XCircle, Info, Terminal } from 'lucide-react';
import { AppSettings } from '../../../types/settings';
import { SettingsRowCard, SelectDropdown } from '../../common';
import { useDockerEngine } from '../../../features/docker';

interface DockerTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DockerTab: React.FC<DockerTabProps> = ({
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const {
    availableEngines,
    activeEngine,
    activeDistro,
    isOnline,
    switchEngine,
    refreshStatus,
  } = useDockerEngine({ settings, onUpdateSettings });

  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const ok = await refreshStatus(activeEngine as 'windows' | 'wsl');
      if (ok) {
        showToast(`Connected to Docker (${activeEngine.toUpperCase()}) successfully!`, 'success');
      } else {
        showToast(`Docker (${activeEngine.toUpperCase()}) is not responding.`, 'error');
      }
    } catch {
      showToast('Failed to reach Docker daemon.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const isWSL = activeEngine === 'wsl';
  const endpoint = isWSL ? 'tcp://127.0.0.1:2375' : 'npipe:////./pipe/docker_engine';

  return (
    <div className="space-y-4">
      {/* 1. Default Docker Engine Provider */}
      <SettingsRowCard
        icon={isWSL ? <Terminal className="w-4 h-4 text-sky-500" /> : <Boxes className="w-4 h-4 text-brand-500" />}
        title="Docker Engine Provider"
        description="Select which local Docker runtime Octa connects to (Windows Docker Desktop or WSL2 Linux)"
      >
        {availableEngines.length <= 1 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs text-slate-700 dark:text-zinc-300 font-medium">
            <span>{availableEngines[0]?.label || 'Docker Desktop (Windows)'}</span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">(Auto-locked)</span>
          </div>
        ) : (
          <SelectDropdown
            value={activeEngine}
            onChange={(val) => switchEngine(val as 'windows' | 'wsl')}
            options={availableEngines.map((e) => ({
              value: e.id,
              label: e.label,
            }))}
          />
        )}
      </SettingsRowCard>

      {/* 2. Connection Target Info & Health Check */}
      <SettingsRowCard
        icon={<Info className="w-4 h-4 text-amber-500" />}
        title="Connection Endpoint"
        description={`Target endpoint: ${endpoint}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-xs font-mono">
            {isOnline ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[11px] font-semibold">Online</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400 font-sans text-[11px] font-semibold">Offline</span>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={isTesting}
            onClick={handleTestConnection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={isTesting ? 'w-3.5 h-3.5 animate-spin text-brand-500' : 'w-3.5 h-3.5'} />
            <span>Test Connection</span>
          </button>
        </div>
      </SettingsRowCard>

      {/* Helpful hint box */}
      <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300 leading-relaxed space-y-1">
        <p className="font-semibold">Docker Provider Configuration:</p>
        <p className="text-[11px] opacity-90">
          • <strong>Docker Desktop (Windows)</strong> connects via the native Windows Named Pipe (<code className="font-mono text-[10px]">npipe:////./pipe/docker_engine</code>).
        </p>
        <p className="text-[11px] opacity-90">
          • <strong>WSL2 (Linux)</strong> connects via TCP (<code className="font-mono text-[10px]">tcp://127.0.0.1:2375</code>). Ensure the Docker daemon is running inside your {activeDistro || 'Linux'} distribution.
        </p>
      </div>
    </div>
  );
};
