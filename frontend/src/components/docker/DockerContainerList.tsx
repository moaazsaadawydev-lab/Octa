import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Boxes,
  Box,
} from 'lucide-react';
import clsx from 'clsx';
import { DockerProjectGroup, DockerContainer } from '../../types/docker';
import { startDockerContainer, stopDockerContainer } from '../../services/api';
import { DockerContainerItem } from './DockerContainerItem';

interface DockerContainerListProps {
  groups: DockerProjectGroup[];
  selectedContainerId: string | null;
  onSelectContainer: (container: DockerContainer) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onlyRunning: boolean;
  setOnlyRunning: (val: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  width?: number;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DockerContainerList: React.FC<DockerContainerListProps> = ({
  groups,
  selectedContainerId,
  onSelectContainer,
  searchTerm,
  setSearchTerm,
  onlyRunning,
  setOnlyRunning,
  onRefresh,
  isRefreshing,
  width,
  showToast,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const toggleGroup = (projectName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [projectName]: !prev[projectName],
    }));
  };

  const handleQuickToggle = async (e: React.MouseEvent, container: DockerContainer) => {
    e.stopPropagation();
    setActionLoadingId(container.id);
    try {
      if (container.state === 'running') {
        await stopDockerContainer(container.id);
        if (showToast) showToast(`Stopped ${container.service || container.name}`, 'info');
      } else {
        await startDockerContainer(container.id);
        if (showToast) showToast(`Started ${container.service || container.name}`, 'success');
      }
      onRefresh();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to update container state', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredGroups = groups
    .map((group) => {
      const filteredContainers = group.containers.filter((c) => {
        if (onlyRunning && c.state !== 'running') return false;
        if (!searchTerm.trim()) return true;

        const q = searchTerm.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.service.toLowerCase().includes(q) ||
          c.image.toLowerCase().includes(q) ||
          c.portsRaw.toLowerCase().includes(q) ||
          c.project.toLowerCase().includes(q)
        );
      });

      return {
        ...group,
        containers: filteredContainers,
      };
    })
    .filter((g) => g.containers.length > 0);

  const totalContainersCount = groups.reduce((acc, g) => acc + g.totalContainers, 0);
  const totalRunningCount = groups.reduce((acc, g) => acc + g.runningContainers, 0);

  return (
    <div
      style={width ? { width: `${width}px`, minWidth: '240px', maxWidth: '600px' } : undefined}
      className={clsx(
        "h-full flex flex-col bg-white dark:bg-[#0c0d12] border-r border-slate-200 dark:border-zinc-800 flex-shrink-0 select-none font-sans transition-colors",
        !width && "w-80"
      )}
    >
      {/* 1. Header Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-zinc-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
              Docker Engine
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
              {totalRunningCount}/{totalContainersCount}
            </span>

            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Containers List"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search containers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-brand-500 transition-colors font-sans"
          />
        </div>

        {/* Filter Toggle: Running Only */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 pt-0.5">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={onlyRunning}
              onChange={(e) => setOnlyRunning(e.target.checked)}
              className="rounded border-slate-300 dark:border-zinc-700 text-brand-500 focus:ring-0 cursor-pointer"
            />
            <span>Running Only</span>
          </label>

          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
            {filteredGroups.reduce((acc, g) => acc + g.containers.length, 0)} visible
          </span>
        </div>
      </div>

      {/* 2. Container Groups Tree View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredGroups.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500">
            No containers found matching your search.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.project] || false;
            const isStandalone = group.project === 'Standalone Containers';

            return (
              <div key={group.project} className="space-y-1">
                {/* Group Accordion Header */}
                <div
                  onClick={() => toggleGroup(group.project)}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                    )}
                    {isStandalone ? (
                      <Box className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <Boxes className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                    )}
                    <span className="truncate font-mono text-[11px]">{group.project}</span>
                  </div>

                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                    {group.containers.filter((c) => c.state === 'running').length}/
                    {group.containers.length}
                  </span>
                </div>

                {/* Group Containers List */}
                {!isCollapsed && (
                  <div className="pl-3 space-y-0.5 border-l border-slate-200 dark:border-zinc-800 ml-3">
                    {group.containers.map((container) => (
                      <DockerContainerItem
                        key={container.id}
                        container={container}
                        isSelected={selectedContainerId === container.id}
                        isLoadingAction={actionLoadingId === container.id}
                        onSelect={() => onSelectContainer(container)}
                        onToggle={(e) => handleQuickToggle(e, container)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
