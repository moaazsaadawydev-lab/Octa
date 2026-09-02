import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScrollText,
  Search,
  Trash2,
  ArrowDown,
  Copy,
  Check,
  Play,
  Square,
  RotateCw,
  Clock,
  HardDrive,
  Network,
  Layers,
  AlertTriangle,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { DockerContainer } from '../../types/docker';
import {
  startDockerContainer,
  stopDockerContainer,
  restartDockerContainer,
  removeDockerContainer,
  startDockerLogStream,
  stopDockerLogStream,
} from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';

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
  const [logs, setLogs] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Copy Container ID
  const handleCopyId = async () => {
    if (!container) return;
    try {
      await navigator.clipboard.writeText(container.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      if (showToast) showToast('Container ID copied', 'info');
    } catch (e) {
      console.warn('Failed to copy container ID:', e);
    }
  };

  // Lifecycle Action Handlers
  const handleStart = async () => {
    if (!container) return;
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
    if (!container) return;
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
    if (!container) return;
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
    if (!container) return;
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

  // Real-time Live Log Streaming
  useEffect(() => {
    if (!container?.id) {
      setLogs([]);
      return;
    }

    setLogs([]);
    const eventName = 'docker:logs:' + container.id;

    let unsubscribe: (() => void) | undefined;
    if (runtime && typeof runtime.EventsOn === 'function') {
      unsubscribe = runtime.EventsOn(eventName, (chunk: string) => {
        if (!chunk) return;
        const newLines = chunk.split('\n').filter((l) => l.length > 0);
        setLogs((prev) => {
          const combined = [...prev, ...newLines];
          // Keep last 2500 lines in memory
          return combined.length > 2500 ? combined.slice(combined.length - 2500) : combined;
        });
      });
    }

    startDockerLogStream(container.id);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (runtime && typeof runtime.EventsOff === 'function') {
        runtime.EventsOff(eventName);
      }
      stopDockerLogStream(container.id);
    };
  }, [container?.id]);

  // Auto-Scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Handle user manual scroll up (disables auto-scroll if user scrolled up)
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!searchFilter.trim()) return logs;
    const q = searchFilter.toLowerCase();
    return logs.filter((l) => l.toLowerCase().includes(q));
  }, [logs, searchFilter]);

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

  const isRunning = container.state === 'running';

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors relative">
      {/* 1. Container Summary Header */}
      <div className="p-4 bg-white dark:bg-[#0c0d12] border-b border-slate-200 dark:border-zinc-800 flex flex-col gap-3 flex-shrink-0 select-none transition-colors">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Service & Container Title */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={clsx(
                'w-3 h-3 rounded-full flex-shrink-0',
                isRunning
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                  : 'bg-slate-400 dark:bg-zinc-600'
              )}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {container.service || container.name}
                </h2>
                {container.service !== container.name && (
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                    ({container.name})
                  </span>
                )}
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider',
                    isRunning
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                  )}
                >
                  {container.state}
                </span>
              </div>

              {/* ID & Compose Meta */}
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-zinc-400">
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Click to copy full Container ID"
                  className="flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span>{container.id.substring(0, 12)}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                  )}
                </button>

                <div className="flex items-center gap-1 truncate max-w-xs font-mono text-[11px]">
                  <Layers className="w-3 h-3 text-brand-500 flex-shrink-0" />
                  <span className="truncate">{container.image}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={handleStop}
                title="Stop Container"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={handleStart}
                title="Start Container"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
            )}

            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={handleRestart}
              title="Restart Container"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={clsx('w-3.5 h-3.5', actionLoading === 'restart' && 'animate-spin')} />
              <span>Restart</span>
            </button>

            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Container"
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status / Ports Badges Row */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-100 dark:border-zinc-800/80 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <span className="font-mono text-[11px]">{container.status}</span>
          </div>

          {container.portsRaw && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Network className="w-3.5 h-3.5 text-brand-500" />
              <span className="font-mono text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                {container.portsRaw}
              </span>
            </div>
          )}

          {container.size && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <HardDrive className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <span className="font-mono text-[11px]">{container.size}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Logs Sub-Toolbar */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-[#08090d] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0 select-none">
        {/* Search in Logs */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-brand-500 font-mono transition-colors"
            />
          </div>
        </div>

        {/* Right Tools: Line Count, AutoScroll, Clear */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">
            {filteredLogs.length} lines
          </span>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
              autoScroll
                ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-300 dark:border-brand-800/80'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
            )}
          >
            <ArrowDown className="w-3 h-3" />
            <span>Auto-scroll</span>
          </button>

          <button
            type="button"
            onClick={() => setLogs([])}
            title="Clear Log Stream Buffer"
            className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 3. Live Logs Stream Terminal Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full min-h-0 min-w-0 overflow-y-auto bg-[#06070a] text-zinc-300 p-4 font-mono text-xs leading-relaxed select-text shadow-inner"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-zinc-600 font-sans text-xs">
            {searchFilter ? 'No log lines matched your filter' : 'Waiting for container log output...'}
          </div>
        ) : (
          filteredLogs.map((line, idx) => (
            <div
              key={idx}
              className="whitespace-pre-wrap break-all hover:bg-white/5 px-1 rounded transition-colors"
            >
              {line}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white dark:bg-[#12131a] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Delete Container?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  This will forcibly stop and remove container <span className="font-mono text-slate-800 dark:text-zinc-200 font-semibold">{container.service || container.name}</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemove(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Delete Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
