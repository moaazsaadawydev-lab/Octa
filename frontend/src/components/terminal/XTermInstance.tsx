import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useTheme } from '../../context/ThemeContext';
import {
  startTerminalSession,
  writeTerminalSession,
  resizeTerminalSession,
  closeTerminalSession,
} from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';
import { PasteConfirmModal } from './PasteConfirmModal';

interface XTermInstanceProps {
  sessionId: string;
  workDir?: string;
  isActive: boolean;
  onFocus?: () => void;
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
  onFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const { resolvedTheme } = useTheme();

  // Stable refs for callbacks & props to avoid effect re-triggers
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  const workDirRef = useRef(workDir);
  workDirRef.current = workDir;

  // Multi-line Paste Modal State
  const [pasteModalText, setPasteModalText] = useState<string | null>(null);

  // Helper: Copy text to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else if (runtime && typeof runtime.ClipboardSetText === 'function') {
        await runtime.ClipboardSetText(text);
      }
    } catch (err) {
      console.warn('[Terminal] Failed to copy to clipboard:', err);
    }
  }, []);

  // Helper: Paste text from clipboard with multi-line safety confirmation
  const pasteFromClipboard = useCallback(async () => {
    try {
      let text = '';
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        text = await navigator.clipboard.readText();
      } else if (runtime && typeof runtime.ClipboardGetText === 'function') {
        text = await runtime.ClipboardGetText();
      }
      if (!text) return;

      // Safe multi-line & character count check
      const isMultiLine = text.includes('\n') || text.includes('\r');
      const isLarge = text.length > 300;

      if (isMultiLine || isLarge) {
        setPasteModalText(text);
      } else {
        writeTerminalSession(sessionId, text);
      }
    } catch (err) {
      console.warn('[Terminal] Failed to paste from clipboard:', err);
    }
  }, [sessionId]);

  const handleConfirmPaste = () => {
    if (pasteModalText) {
      writeTerminalSession(sessionId, pasteModalText);
      setPasteModalText(null);
      termRef.current?.focus();
    }
  };

  const handleCancelPaste = () => {
    setPasteModalText(null);
    termRef.current?.focus();
  };

  // 1. Terminal Lifecycle Setup (STRICTLY dependent on sessionId only)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sessionId) return;

    // Create xterm Terminal with GPU acceleration support
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      lineHeight: 1.2,
      fontFamily: "'MesloLGS NF', 'FiraCode Nerd Font', 'CaskaydiaCove Nerd Font', 'JetBrains Mono', Consolas, monospace",
      allowProposedApi: true,
      allowTransparency: true,
      convertEol: true,
      theme: resolvedTheme === 'dark' ? DARK_THEME : LIGHT_THEME,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(container);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Load WebGL Hardware Acceleration
    let webglAddon: WebglAddon | null = null;
    try {
      webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        console.warn('[Terminal] WebGL context lost, falling back to standard renderer.');
        webglAddon?.dispose();
        webglAddon = null;
        webglAddonRef.current = null;
      });
      term.loadAddon(webglAddon);
      webglAddonRef.current = webglAddon;
      console.log('[Terminal] WebGL acceleration enabled successfully.');
    } catch (err) {
      console.warn('[Terminal] WebGL acceleration not available, using default renderer:', err);
    }

    // Attach Custom Key Event Handler for Clipboard Shortcuts
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (onFocusRef.current) {
        onFocusRef.current();
      }

      // 1. Paste: Ctrl + V or Ctrl + Shift + V (handled manually; suppressed from browser and xterm)
      if (isCtrlOrCmd && (event.code === 'KeyV' || event.key === 'V' || event.key === 'v')) {
        if (event.type === 'keydown') {
          pasteFromClipboard();
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // 2. Copy: Ctrl + Shift + C
      if (isCtrlOrCmd && event.shiftKey && (event.code === 'KeyC' || event.key === 'C' || event.key === 'c')) {
        if (event.type === 'keydown') {
          const selection = term.getSelection();
          if (selection) {
            copyToClipboard(selection);
          }
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // 3. Smart Copy: Standard Ctrl + C when text is highlighted -> Copy text without sending SIGINT
      if (isCtrlOrCmd && !event.shiftKey && (event.code === 'KeyC' || event.key === 'c')) {
        if (term.hasSelection()) {
          if (event.type === 'keydown') {
            const selection = term.getSelection();
            if (selection) {
              copyToClipboard(selection);
              term.clearSelection();
            }
          }
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
        // If no text selected, let Ctrl+C pass through to PowerShell as SIGINT / cancel command
        return true;
      }

      return true;
    });

    // Suppress browser native paste events so they do not duplicate into onData
    const handleNativePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    container.addEventListener('paste', handleNativePaste, true);

    // Right-Click Context Menu Handling (Copy if selected, Paste if no selection)
    const handleContextMenu = async (e: MouseEvent) => {
      e.preventDefault();
      if (onFocusRef.current) onFocusRef.current();

      if (term.hasSelection()) {
        const selection = term.getSelection();
        if (selection) {
          await copyToClipboard(selection);
          term.clearSelection();
        }
      } else {
        await pasteFromClipboard();
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);

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

    startTerminalSession(sessionId, workDirRef.current || '', initialCols, initialRows);
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

    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('paste', handleNativePaste, true);
      container.removeEventListener('contextmenu', handleContextMenu);
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
      if (webglAddonRef.current) {
        try {
          webglAddonRef.current.dispose();
        } catch (e) {
          // ignore
        }
        webglAddonRef.current = null;
      }
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId]);

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
    if (onFocusRef.current) onFocusRef.current();
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

      {/* Multi-Line Paste Confirmation Modal */}
      {pasteModalText && (
        <PasteConfirmModal
          isOpen={true}
          text={pasteModalText}
          onConfirm={handleConfirmPaste}
          onCancel={handleCancelPaste}
        />
      )}
    </div>
  );
};
