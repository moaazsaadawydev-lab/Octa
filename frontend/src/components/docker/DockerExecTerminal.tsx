import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { RefreshCw, Terminal as TerminalIcon, Play, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

import { DockerContainer } from '../../types/docker';
import {
  startContainerExec,
  writeContainerExec,
  resizeContainerExec,
  closeContainerExec,
} from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';

interface DockerExecTerminalProps {
  container: DockerContainer | null;
  onStartContainer?: () => void;
  isStarting?: boolean;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DockerExecTerminal: React.FC<DockerExecTerminalProps> = ({
  container,
  onStartContainer,
  isStarting = false,
  showToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  const [sessionKey, setSessionKey] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClear = () => {
    if (termRef.current) {
      termRef.current.clear();
    }
  };

  const handleReconnect = () => {
    setSessionKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (!container?.id || container.state !== 'running' || !containerRef.current) {
      setIsConnected(false);
      return;
    }

    const containerId = container.id;
    const domNode = containerRef.current;
    const sessionId = `exec-${containerId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    activeSessionIdRef.current = sessionId;
    setErrorMessage(null);
    setIsConnected(false);

    let isCleanedUp = false;

    // 1. Initialize Interactive XTerm
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      convertEol: true,
      fontSize: 12,
      fontFamily: 'Consolas, "Cascadia Code", "Fira Code", monospace',
      theme: {
        background: '#090a0f',
        foreground: '#d4d4d8',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f4f4f5',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fde047',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(domNode);

    // Hardware Acceleration via WebGL
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
    } catch {
      // Fallback to Canvas/DOM
    }

    // Initial fit calculation
    let initialCols = 80;
    let initialRows = 24;
    try {
      fitAddon.fit();
      initialCols = term.cols || 80;
      initialRows = term.rows || 24;
    } catch {
      // Fallback
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send keystrokes to container stdin
    const onDataDisposable = term.onData((data) => {
      if (!isCleanedUp) {
        writeContainerExec(sessionId, data);
      }
    });

    // Handle terminal resizing
    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      if (!isCleanedUp) {
        resizeContainerExec(sessionId, cols, rows);
      }
    });

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (isCleanedUp) return;
        try {
          fitAddon.fit();
          if (term.cols && term.rows) {
            resizeContainerExec(sessionId, term.cols, term.rows);
          }
        } catch {
          // Ignore
        }
      });
    });
    resizeObserver.observe(domNode);

    // Subscribe to incoming stream chunks from backend PTY
    const eventName = `docker:exec:data:${sessionId}`;
    let unsubscribe: (() => void) | undefined;

    if (runtime && typeof runtime.EventsOn === 'function') {
      unsubscribe = runtime.EventsOn(eventName, (chunk: string) => {
        if (!chunk || isCleanedUp) return;
        term.write(chunk);
      });
    }

    // Start Exec Session in Backend
    startContainerExec(sessionId, containerId, initialCols, initialRows)
      .then(() => {
        if (isCleanedUp) {
          closeContainerExec(sessionId).catch(console.error);
          return;
        }
        setIsConnected(true);
        term.focus();
      })
      .catch((err: any) => {
        if (isCleanedUp) return;
        console.error('[Exec Session Error]:', err);
        setErrorMessage(err?.message || 'Failed to start interactive exec session');
        term.write(`\r\n\x1b[31m[Error starting exec session]: ${err?.message || err}\x1b[0m\r\n`);
      });

    return () => {
      isCleanedUp = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (runtime && typeof runtime.EventsOff === 'function') {
        runtime.EventsOff(eventName);
      }
      closeContainerExec(sessionId).catch(console.error);
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      activeSessionIdRef.current = null;
    };
  }, [container?.id, sessionKey]);

  if (!container || container.state !== 'running') {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50/50 dark:bg-[#090a0f] transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-slate-400 dark:text-zinc-400 shadow-sm">
          <TerminalIcon className="w-7 h-7 text-brand-500 dark:text-brand-400" />
        </div>
        <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
          Container is Not Running
        </span>
        <span className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Interactive Exec terminal is only available for running containers. Start the container to attach an interactive shell.
        </span>

        {onStartContainer && (
          <button
            type="button"
            disabled={isStarting}
            onClick={onStartContainer}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className={clsx('w-3.5 h-3.5 fill-current', isStarting && 'animate-spin')} />
            <span>{isStarting ? 'Starting Container...' : 'Start Container'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 bg-[#090a0f] text-zinc-100 overflow-hidden font-sans select-none relative">
      {/* Sub-toolbar */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-[#08090d] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'
            )}
          />
          <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400">
            {isConnected ? `exec shell: ${container.service || container.name}` : 'Connecting shell...'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReconnect}
            title="Restart / Reconnect Shell"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            title="Clear Terminal Canvas"
            className="px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 w-full h-full min-h-0 min-w-0 bg-[#090a0f] p-3 overflow-hidden relative">
        <div
          ref={containerRef}
          className="w-full h-full min-h-0 min-w-0 overflow-hidden"
        />
      </div>
    </div>
  );
};
