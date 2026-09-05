import { useEffect, RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { AppSettings } from '../../types/settings';
import { resizeTerminalSession } from '../../services/api';
import { DARK_THEME, LIGHT_THEME, mapCursorStyle } from './terminalThemes';

interface UseTerminalSettingsSyncProps {
  termRef: RefObject<Terminal | null>;
  fitAddonRef: RefObject<FitAddon | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  sessionId: string;
  settings?: AppSettings;
  resolvedTheme: string;
  isActive: boolean;
}

export function useTerminalSettingsSync({
  termRef,
  fitAddonRef,
  containerRef,
  sessionId,
  settings,
  resolvedTheme,
  isActive,
}: UseTerminalSettingsSyncProps) {
  // 1. Synchronize Theme Changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = resolvedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
    }
  }, [resolvedTheme, termRef]);

  // 2. Clear terminal buffer on Ctrl + Shift + K shortcut event
  useEffect(() => {
    const handleClearTerminal = () => {
      if (isActive && termRef.current) {
        termRef.current.clear();
      }
    };
    window.addEventListener('octa:terminal:clear', handleClearTerminal);
    return () => window.removeEventListener('octa:terminal:clear', handleClearTerminal);
  }, [isActive, termRef]);

  // 3. Live Synchronize Terminal Settings (Font Size, Cursor Style, Re-fit)
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const targetFontSize = settings?.terminalFontSize || 14;
    if (term.options.fontSize !== targetFontSize) {
      term.options.fontSize = targetFontSize;
      try {
        fitAddonRef.current?.fit();
        const { cols, rows } = term;
        if (cols > 0 && rows > 0) {
          resizeTerminalSession(sessionId, cols, rows);
        }
      } catch (e) {
        // ignore
      }
    }

    const targetCursorStyle = mapCursorStyle(settings?.terminalCursorStyle);
    if (term.options.cursorStyle !== targetCursorStyle) {
      term.options.cursorStyle = targetCursorStyle;
    }
  }, [settings?.terminalFontSize, settings?.terminalCursorStyle, sessionId, termRef, fitAddonRef]);

  // 4. Global Event Listener for immediate cross-component sync
  useEffect(() => {
    const handleGlobalSettings = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>;
      const s = customEvent.detail;
      const term = termRef.current;
      if (!s || !term) return;

      if (s.terminalFontSize && term.options.fontSize !== s.terminalFontSize) {
        term.options.fontSize = s.terminalFontSize;
        try {
          fitAddonRef.current?.fit();
          const { cols, rows } = term;
          if (cols > 0 && rows > 0) {
            resizeTerminalSession(sessionId, cols, rows);
          }
        } catch (err) {}
      }

      if (s.terminalCursorStyle) {
        const mapped = mapCursorStyle(s.terminalCursorStyle);
        if (term.options.cursorStyle !== mapped) {
          term.options.cursorStyle = mapped;
        }
      }
    };

    window.addEventListener('octa:settings:changed', handleGlobalSettings);
    return () => window.removeEventListener('octa:settings:changed', handleGlobalSettings);
  }, [sessionId, termRef, fitAddonRef]);

  // 5. Handle Active Tab Focus & Re-fit
  useEffect(() => {
    if (isActive && termRef.current && fitAddonRef.current) {
      const timer = setTimeout(() => {
        try {
          const container = containerRef.current;
          if (container && container.clientWidth > 0 && container.clientHeight > 0) {
            fitAddonRef.current?.fit();
            const term = termRef.current;
            if (term) {
              const { cols, rows } = term;
              if (cols > 0 && rows > 0) {
                resizeTerminalSession(sessionId, cols, rows);
              }
              term.focus();
            }
          }
        } catch (e) {
          // ignore
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isActive, sessionId, termRef, fitAddonRef, containerRef]);
}
