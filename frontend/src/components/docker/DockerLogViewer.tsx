import React, { useState, useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { DockerContainer } from '../../types/docker';
import {
  startDockerContainer,
  stopDockerContainer,
  restartDockerContainer,
  removeDockerContainer,
} from '../../services/api';
import { DockerExecTerminal } from './DockerExecTerminal';
import { DockerHeaderToolbar } from './DockerHeaderToolbar';
import { DockerLogsToolbar } from './DockerLogsToolbar';
import { DockerDeleteModal } from './DockerDeleteModal';
import { useDockerLogStream } from './useDockerLogStream';

interface DockerLogViewerProps {
  container: DockerContainer | null;
  onRefreshList: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DockerLogViewer: React.FC<DockerLogViewerProps> = ({
  container,
  onRefreshList,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'terminal'>('logs');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // If container stops, revert from terminal to logs
  useEffect(() => {
    if (container?.state !== 'running' && activeTab === 'terminal') {
      setActiveTab('logs');
    }
  }, [container?.state, activeTab]);

  const logStream = useDockerLogStream({
    containerId: container?.id,
    activeTab,
  });

  if (!container) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50/50 dark:bg-[#090a0f]">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-slate-400 dark:text-zinc-400 shadow-sm">
          <ScrollText className="w-6 h-6 text-brand-500 dark:text-brand-400" />
        </div>
        <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
          No Container Selected
        </span>
        <span className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Select a Docker container or Compose service from the left sidebar to inspect details and stream live logs.
        </span>
      </div>
    );
  }

  const handleStart = async () => {
    setActionLoading('start');
    try {
      await startDockerContainer(container.id);
      if (showToast) showToast(`Started ${container.service || container.name}`, 'success');
      onRefreshList();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to start container', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    try {
      await stopDockerContainer(container.id);
      if (showToast) showToast(`Stopped ${container.service || container.name}`, 'info');
      onRefreshList();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to stop container', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    setActionLoading('restart');
    try {
      await restartDockerContainer(container.id);
      if (showToast) showToast(`Restarted ${container.service || container.name}`, 'success');
      onRefreshList();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to restart container', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (force: boolean = true) => {
    setActionLoading('remove');
    setShowDeleteConfirm(false);
    try {
      await removeDockerContainer(container.id, force);
      if (showToast) showToast(`Deleted container ${container.service || container.name}`, 'success');
      onRefreshList();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to delete container', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors relative">
      {/* 1. Header Toolbar */}
      <DockerHeaderToolbar
        container={container}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        actionLoading={actionLoading}
        onStart={handleStart}
        onStop={handleStop}
        onRestart={handleRestart}
        onDeleteClick={() => setShowDeleteConfirm(true)}
        showToast={showToast}
      />

      {/* 2. Main Viewport: Exec Terminal or Logs Canvas */}
      {activeTab === 'terminal' ? (
        <DockerExecTerminal
          container={container}
          onStartContainer={handleStart}
          isStarting={actionLoading === 'start'}
          showToast={showToast}
        />
      ) : (
        <>
          <DockerLogsToolbar
            searchTerm={logStream.searchTerm}
            onSearchChange={logStream.handleSearchChange}
            onFindNext={logStream.handleFindNext}
            onFindPrevious={logStream.handleFindPrevious}
            autoScroll={logStream.autoScroll}
            onToggleAutoScroll={() => logStream.setAutoScroll(!logStream.autoScroll)}
            onClear={logStream.handleClear}
          />

          <div className="flex-1 w-full h-full min-h-0 min-w-0 bg-[#090a0f] p-3 overflow-hidden relative">
            <div
              ref={logStream.containerRef}
              className="w-full h-full min-h-0 min-w-0 overflow-hidden"
            />
          </div>
        </>
      )}

      {/* 3. Delete Modal */}
      <DockerDeleteModal
        isOpen={showDeleteConfirm}
        container={container}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => handleRemove(true)}
      />
    </div>
  );
};
