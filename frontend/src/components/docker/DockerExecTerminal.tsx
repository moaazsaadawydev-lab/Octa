import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { openExternalUrl } from '../../utils/urlUtils';

import { DockerContainer } from '../../types/docker';
import {
  startContainerExec,
  writeContainerExec,
  resizeContainerExec,
  closeContainerExec,
} from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';
import { useTerminalClipboard } from '../terminal/useTerminalClipboard';
import { PasteConfirmModal } from '../terminal/PasteConfirmModal';
import { DockerExecEmptyState } from './DockerExecEmptyState';
import { DockerExecToolbar } from './DockerExecToolbar';

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

  const handleWrite = useCallback((data: string) => {
    if (activeSessionIdRef.current) {
      writeContainerExec(activeSessionIdRef.current, data);
    }
  }, []);

  const {
    pasteModalText,
    handleConfirmPaste,
    handleCancelPaste,
    createCustomKeyEventHandler,
    handleNativePaste,
    handleContextMenu,
  } = useTerminalClipboard({
    termRef,
    onWrite: handleWrite,
  });

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
    const webLinksAddon = new WebLinksAddon((_event, uri) => openExternalUrl(uri));
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
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

    // Attach Clipboard & Context Menu Handlers (Ctrl+V, Ctrl+C, Right-Click paste/copy)
    term.attachCustomKeyEventHandler(createCustomKeyEventHandler());
    domNode.addEventListener('paste', handleNativePaste, true);
    domNode.addEventListener('contextmenu', handleContextMenu);

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
      domNode.removeEventListener('paste', handleNativePaste, true);
      domNode.removeEventListener('contextmenu', handleContextMenu);
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      activeSessionIdRef.current = null;
    };
  }, [container?.id, sessionKey, createCustomKeyEventHandler, handleContextMenu, handleNativePaste]);

  if (!container || container.state !== 'running') {
    return (
      <DockerExecEmptyState
        onStartContainer={onStartContainer}
        isStarting={isStarting}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 bg-[#090a0f] text-zinc-100 overflow-hidden font-sans select-none relative">
      <DockerExecToolbar
        container={container}
        isConnected={isConnected}
        onReconnect={handleReconnect}
        onClear={handleClear}
      />

      {/* Terminal Viewport */}
      <div className="flex-1 w-full h-full min-h-0 min-w-0 bg-[#090a0f] p-3 overflow-hidden relative">
        <div
          ref={containerRef}
          className="w-full h-full min-h-0 min-w-0 overflow-hidden"
        />
      </div>

      <PasteConfirmModal
        isOpen={Boolean(pasteModalText)}
        text={pasteModalText || ''}
        onConfirm={handleConfirmPaste}
        onCancel={handleCancelPaste}
      />
    </div>
  );
};
