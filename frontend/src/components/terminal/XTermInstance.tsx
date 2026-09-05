import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useTheme } from '../../context/ThemeContext';
import { AppSettings } from '../../types/settings';
import {
  startTerminalSession,
  writeTerminalSession,
  resizeTerminalSession,
  closeTerminalSession,
} from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';
import { PasteConfirmModal } from './PasteConfirmModal';
import { DARK_THEME, LIGHT_THEME, mapCursorStyle } from './terminalThemes';
import { useTerminalClipboard } from './useTerminalClipboard';
import { useTerminalSettingsSync } from './useTerminalSettingsSync';

interface XTermInstanceProps {
  sessionId: string;
  workDir?: string;
  shell?: string;
  isActive: boolean;
  settings?: AppSettings;
  onFocus?: () => void;
}

export const XTermInstance: React.FC<XTermInstanceProps> = ({
  sessionId,
  workDir = '',
  shell,
  isActive,
  settings,
  onFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const { resolvedTheme } = useTheme();

  // Stable refs for callbacks & props
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  const workDirRef = useRef(workDir);
  workDirRef.current = workDir;

  const shellRef = useRef(shell);
  shellRef.current = shell;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const copyOnSelectRef = useRef(Boolean(settings?.terminalCopyOnSelect));
  copyOnSelectRef.current = Boolean(settings?.terminalCopyOnSelect);

  const {
    pasteModalText,
    handleConfirmPaste,
    handleCancelPaste,
    createCustomKeyEventHandler,
    handleNativePaste,
    handleContextMenu,
  } = useTerminalClipboard({
    sessionId,
    termRef,
    onFocusRef,
  });

  // Terminal Lifecycle Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sessionId) return;

    const initialFontSize = settingsRef.current?.terminalFontSize || 14;
    const initialCursorStyle = mapCursorStyle(settingsRef.current?.terminalCursorStyle);

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: initialCursorStyle,
      fontSize: initialFontSize,
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
    } catch (err) {
      console.warn('[Terminal] WebGL acceleration not available, using default renderer:', err);
    }

    term.attachCustomKeyEventHandler(createCustomKeyEventHandler());

    container.addEventListener('paste', handleNativePaste, true);
    container.addEventListener('contextmenu', handleContextMenu);

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

    try {
      fitAddon.fit();
    } catch (e) {}

    const initialCols = term.cols || 120;
    const initialRows = term.rows || 30;
    const shellToLaunch = shellRef.current || settingsRef.current?.terminalShell || 'powershell';

    startTerminalSession(sessionId, workDirRef.current || '', initialCols, initialRows, shellToLaunch);
    term.focus();

    const onDataDisposable = term.onData((data) => {
      writeTerminalSession(sessionId, data);
    });

    const selectionDisposable = term.onSelectionChange(() => {
      if (copyOnSelectRef.current && term.hasSelection()) {
        const selected = term.getSelection();
        if (selected) {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(selected).catch(() => {});
          } else if (runtime && typeof runtime.ClipboardSetText === 'function') {
            runtime.ClipboardSetText(selected);
          }
        }
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!fitAddonRef.current || !termRef.current) return;
      try {
        fitAddonRef.current.fit();
        const { cols, rows } = termRef.current;
        if (cols > 0 && rows > 0) {
          resizeTerminalSession(sessionId, cols, rows);
        }
      } catch (e) {}
    });

    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('paste', handleNativePaste, true);
      container.removeEventListener('contextmenu', handleContextMenu);
      selectionDisposable.dispose();
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
        } catch (e) {}
        webglAddonRef.current = null;
      }
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, createCustomKeyEventHandler, handleContextMenu, handleNativePaste, resolvedTheme]);

  useTerminalSettingsSync({
    termRef,
    fitAddonRef,
    containerRef,
    sessionId,
    settings,
    resolvedTheme,
    isActive,
  });

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
