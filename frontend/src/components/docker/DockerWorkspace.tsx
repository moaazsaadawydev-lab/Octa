import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Boxes } from 'lucide-react';
import { DockerProjectGroup, DockerContainer } from '../../types/docker';
import { checkDockerAvailability, listDockerContainers } from '../../services/api';
import { DockerContainerList } from './DockerContainerList';
import { DockerLogViewer } from './DockerLogViewer';

interface DockerWorkspaceProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DockerWorkspace: React.FC<DockerWorkspaceProps> = ({ showToast }) => {
  const [isDockerAvailable, setIsDockerAvailable] = useState<boolean | null>(null);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [groups, setGroups] = useState<DockerProjectGroup[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyRunning, setOnlyRunning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Containers
  const fetchContainers = useCallback(async (isInitial: boolean = false) => {
    setIsRefreshing(true);
    try {
      console.log('[Frontend DockerWorkspace] Calling checkDockerAvailability...');
      const avail = await checkDockerAvailability();
      console.log('[Frontend DockerWorkspace] Availability result:', avail);
      if (!avail.available) {
        setIsDockerAvailable(false);
        setDockerError(avail.error || 'Docker Engine daemon is not responding');
        setGroups([]);
        setSelectedContainer(null);
        return;
      }

      setIsDockerAvailable(true);
      setDockerError(null);

      console.log('[Frontend DockerWorkspace] Calling listDockerContainers...');
      const result = await listDockerContainers(false);
      console.log('[Frontend DockerWorkspace] ListContainers result count:', result.length);
      setGroups(result);

      // Preserve or auto-select active container
      setSelectedContainer((prev) => {
        if (prev) {
          // Find updated instance of prev container
          for (const g of result) {
            const found = g.containers.find((c) => c.id === prev.id);
            if (found) return found;
          }
        }
        // Fallback: Pick first running container or first available
        if (result.length > 0) {
          for (const g of result) {
            const running = g.containers.find((c) => c.state === 'running');
            if (running) return running;
          }
          return result[0]?.containers[0] || null;
        }
        return null;
      });
    } catch (err: any) {
      setIsDockerAvailable(false);
      setDockerError(err?.message || 'Failed to connect to Docker daemon');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers(true);
  }, [fetchContainers]);

  // If Docker Daemon is not running, show dedicated Zero-State
  if (isDockerAvailable === false) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-[#090a0f] transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 shadow-sm">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">
          Docker Daemon Not Reachable
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm leading-relaxed">
          Octa could not communicate with the local Docker Engine. Please ensure Docker Desktop or the Docker daemon service is started and running.
        </p>

        {dockerError && (
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 font-mono text-[11px] max-w-md truncate">
            {dockerError}
          </div>
        )}

        <button
          type="button"
          onClick={() => fetchContainers(false)}
          className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className={isRefreshing ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
          <span>Refresh Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex w-full h-full min-h-0 min-w-0 bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans select-none transition-colors">
      {/* 1. Left Project & Container Explorer Column */}
      <DockerContainerList
        groups={groups}
        selectedContainerId={selectedContainer?.id || null}
        onSelectContainer={setSelectedContainer}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onlyRunning={onlyRunning}
        setOnlyRunning={setOnlyRunning}
        onRefresh={() => fetchContainers(false)}
        isRefreshing={isRefreshing}
        showToast={showToast}
      />

      {/* 2. Right Detail & Real-Time Log Viewer Column */}
      <DockerLogViewer
        container={selectedContainer}
        onRefreshList={() => fetchContainers(false)}
        showToast={showToast}
      />
    </div>
  );
};
