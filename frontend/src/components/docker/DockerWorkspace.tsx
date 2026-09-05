import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DockerProjectGroup, DockerContainer } from '../../types/docker';
import { AppSettings } from '../../types/settings';
import { checkDockerAvailability, listDockerContainers } from '../../services/api';
import { DockerContainerList } from './DockerContainerList';
import { DockerLogViewer } from './DockerLogViewer';
import { DockerUnreachableState } from './DockerUnreachableState';
import { useDockerEngine } from '../../features/docker';

interface DockerWorkspaceProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  settings?: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
  isVisible?: boolean;
}

export const DockerWorkspace: React.FC<DockerWorkspaceProps> = ({
  showToast,
  settings,
  onUpdateSettings,
  isVisible = true,
}) => {
  const [isDockerAvailable, setIsDockerAvailable] = useState<boolean | null>(null);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [groups, setGroups] = useState<DockerProjectGroup[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyRunning, setOnlyRunning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const {
    activeEngine,
    activeDistro,
    availableEngines,
    isOnline,
    switchEngine,
  } = useDockerEngine({ settings, onUpdateSettings });

  // Fetch Containers
  const fetchContainers = useCallback(async (isInitial: boolean = false) => {
    setIsRefreshing(true);
    try {
      const avail = await checkDockerAvailability();
      if (!avail.available) {
        setIsDockerAvailable(false);
        setDockerError(avail.error || 'Docker Engine daemon is not responding');
        setGroups([]);
        setSelectedContainer(null);
        return;
      }

      setIsDockerAvailable(true);
      setDockerError(null);

      const result = await listDockerContainers(false);
      setGroups(result);

      // Preserve or auto-select active container
      setSelectedContainer((prev) => {
        if (prev) {
          for (const g of result) {
            const found = g.containers.find((c) => c.id === prev.id);
            if (found) return found;
          }
        }
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

  const handleSwitchEngine = useCallback(
    async (engine: 'windows' | 'wsl') => {
      await switchEngine(engine);
      await fetchContainers(false);
    },
    [switchEngine, fetchContainers]
  );

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const newWidth = Math.min(Math.max(moveEvent.clientX - rect.left, 240), 600);
        setSidebarWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  useEffect(() => {
    if (isVisible) {
      fetchContainers(true);
    }
  }, [isVisible, fetchContainers]);

  // If initial connection check is in progress, show subtle spinner instead of error flash
  if (isDockerAvailable === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center w-full h-full bg-slate-50 dark:bg-[#090a0f] text-slate-500 dark:text-zinc-500 select-none">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
          Connecting to Docker Engine ({activeEngine === 'wsl' ? 'WSL2' : 'Windows'})...
        </span>
      </div>
    );
  }

  // If Docker Daemon is definitely not running, show dedicated Zero-State
  if (isDockerAvailable === false && !isRefreshing) {
    return (
      <DockerUnreachableState
        onRefresh={() => fetchContainers(false)}
        isRefreshing={isRefreshing}
        dockerError={dockerError}
        activeEngine={activeEngine}
        activeDistro={activeDistro}
        availableEngines={availableEngines}
        onSwitchEngine={handleSwitchEngine}
      />
    );
  }

  return (
    <div
      ref={workspaceRef}
      className="flex-1 flex w-full h-full min-h-0 min-w-0 bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans select-none transition-colors relative"
    >
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
        width={sidebarWidth}
        showToast={showToast}
        activeEngine={activeEngine}
        activeDistro={activeDistro}
        isOnline={isOnline}
        onSwitchEngine={handleSwitchEngine}
      />

      {/* Draggable Vertical Resize Divider */}
      <div
        onMouseDown={startResizing}
        className="w-1 cursor-col-resize hover:bg-brand-500/50 active:bg-brand-500 transition-colors select-none z-10 flex-shrink-0 -ml-0.5 bg-transparent"
        title="Drag to resize sidebar"
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
