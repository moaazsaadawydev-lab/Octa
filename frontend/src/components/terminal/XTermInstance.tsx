import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useTheme } from '../../context/ThemeContext';
import {
  startTerminalSession,
  writeTerminalSession,
  resizeTerminalSession,
  closeTerminalSession,
} from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';

interface XTermInstanceProps {
  sessionId: string;
  workDir?: string;
  isActive: boolean;
}

const DARK_THEME = {
  background: '#090a0f',
  foreground: '#f4f4f5',
  cursor: '#38bdf8',
  cursorAccent: '#090a0f',
  selectionBackground: 'rgba(255, 255, 255, 0.2)',
  selectionForeground: '#ffffff',
  black: '#18181b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#f4f4f5',
  brightBlack: '#71717a',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#ffffff',
};

const LIGHT_THEME = {
  background: '#f8fafc',
  foreground: '#0f172a',
  cursor: '#0284c7',
  cursorAccent: '#f8fafc',
  selectionBackground: 'rgba(0, 0, 0, 0.15)',
  selectionForeground: '#0f172a',
  black: '#0f172a',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#64748b',
  brightBlack: '#475569',
  brightRed: '#b91c1c',
  brightGreen: '#15803d',
  brightYellow: '#a16207',
  brightBlue: '#1d4ed8',
  brightMagenta: '#7e22ce',
  brightCyan: '#0e7490',
  brightWhite: '#0f172a',
};

export const XTermInstance: React.FC<XTermInstanceProps> = ({
  sessionId,
  workDir = '',
  isActive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { resolvedTheme } = useTheme();

  // 1. Terminal Lifecycle Setup
  useEffect(() => {
    if (!containerRef.current) return;

    // Create xterm Terminal
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      lineHeight: 1.2,
      fontFamily: "'MesloLGS NF', 'FiraCode Nerd Font', 'CaskaydiaCove Nerd Font', 'JetBrains Mono', Consolas, monospace",
      allowProposedApi: true,
      convertEol: true,
      theme: resolvedTheme === 'dark' ? DARK_THEME : LIGHT_THEME,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Subscribe to Wails event stream FIRST before starting the process
    const dataEventName = 'terminal:data:' + sessionId;
    const exitEventName = 'terminal:exit:' + sessionId;

    let unsubscribeData: (() => void) | undefined;
    let unsubscribeExit: (() => void) | undefined;

    if (runtime && typeof runtime.EventsOn === 'function') {
      unsubscribeData = runtime.EventsOn(dataEventName, (incoming: string) => {
        term.write(incoming);
      });

      unsubscribeExit = runtime.EventsOn(exitEventName, () => {
        term.write('\r\n\x1b[33m[Process completed]\x1b[0m\r\n');
      });
    }

    // Initial fit & backend process startup
    try {
      fitAddon.fit();
    } catch (e) {
      // ignore
    }

    const initialCols = term.cols || 120;
    const initialRows = term.rows || 30;

    startTerminalSession(sessionId, workDir, initialCols, initialRows);
    term.focus();

    // Wire input streaming
    const onDataDisposable = term.onData((data) => {
      writeTerminalSession(sessionId, data);
    });

    // ResizeObserver for dynamic layout updates
    const resizeObserver = new ResizeObserver(() => {
      if (!fitAddonRef.current || !termRef.current) return;
      try {
        fitAddonRef.current.fit();
        const { cols, rows } = termRef.current;
        if (cols > 0 && rows > 0) {
          resizeTerminalSession(sessionId, cols, rows);
        }
      } catch (e) {
        // ignore
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      onDataDisposable.dispose();
      if (typeof unsubscribeData === 'function') {
        unsubscribeData();
      } else if (runtime && typeof runtime.EventsOff === 'function') {
        runtime.EventsOff(dataEventName);
      }
      if (typeof unsubscribeExit === 'function') {
        unsubscribeExit();
      } else if (runtime && typeof runtime.EventsOff === 'function') {
        runtime.EventsOff(exitEventName);
      }
      resizeObserver.disconnect();
      closeTerminalSession(sessionId);
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, workDir]);

  // 2. Synchronize Theme Changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = resolvedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
    }
  }, [resolvedTheme]);

  // 3. Handle Active Tab Focus & Re-fit
  useEffect(() => {
    if (isActive && termRef.current && fitAddonRef.current) {
      requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit();
          if (termRef.current) {
            const { cols, rows } = termRef.current;
            if (cols > 0 && rows > 0) {
              resizeTerminalSession(sessionId, cols, rows);
            }
            termRef.current.focus();
          }
        } catch (e) {
          // ignore
        }
      });
    }
  }, [isActive, sessionId]);

  const handleContainerClick = () => {
    if (termRef.current) {
      termRef.current.focus();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="w-full h-full min-h-0 min-w-0 flex-1 relative overflow-hidden bg-slate-50 dark:bg-[#090a0f] transition-colors cursor-text"
    >
      <div
        ref={containerRef}
        className="absolute inset-0 p-2 overflow-hidden select-text"
      />
    </div>
  );
};
