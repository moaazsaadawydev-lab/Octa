import { useState, useCallback, RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { writeTerminalSession } from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';

interface UseTerminalClipboardProps {
  sessionId: string;
  termRef: RefObject<Terminal | null>;
  onFocusRef: React.MutableRefObject<(() => void) | undefined>;
}

export function useTerminalClipboard({
  sessionId,
  termRef,
  onFocusRef,
}: UseTerminalClipboardProps) {
  const [pasteModalText, setPasteModalText] = useState<string | null>(null);

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

  const pasteFromClipboard = useCallback(async () => {
    try {
      let text = '';
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        text = await navigator.clipboard.readText();
      } else if (runtime && typeof runtime.ClipboardGetText === 'function') {
        text = await runtime.ClipboardGetText();
      }
      if (!text) return;

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

  const handleConfirmPaste = useCallback(() => {
    if (pasteModalText) {
      writeTerminalSession(sessionId, pasteModalText);
      setPasteModalText(null);
      termRef.current?.focus();
    }
  }, [pasteModalText, sessionId, termRef]);

  const handleCancelPaste = useCallback(() => {
    setPasteModalText(null);
    termRef.current?.focus();
  }, [termRef]);

  const createCustomKeyEventHandler = useCallback(
    () => (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const term = termRef.current;

      if (onFocusRef.current) {
        onFocusRef.current();
      }

      // 1. Paste: Ctrl + V or Ctrl + Shift + V
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
        if (event.type === 'keydown' && term) {
          const selection = term.getSelection();
          if (selection) {
            copyToClipboard(selection);
          }
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // 3. Smart Copy: Standard Ctrl + C when text is highlighted
      if (isCtrlOrCmd && !event.shiftKey && (event.code === 'KeyC' || event.key === 'c')) {
        if (term && term.hasSelection()) {
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
        return true;
      }

      return true;
    },
    [copyToClipboard, pasteFromClipboard, onFocusRef, termRef]
  );

  const handleNativePaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, []);

  const handleContextMenu = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      if (onFocusRef.current) onFocusRef.current();

      const term = termRef.current;
      if (term && term.hasSelection()) {
        const selection = term.getSelection();
        if (selection) {
          await copyToClipboard(selection);
          term.clearSelection();
        }
      } else {
        await pasteFromClipboard();
      }
    },
    [copyToClipboard, onFocusRef, pasteFromClipboard, termRef]
  );

  return {
    pasteModalText,
    handleConfirmPaste,
    handleCancelPaste,
    copyToClipboard,
    pasteFromClipboard,
    createCustomKeyEventHandler,
    handleNativePaste,
    handleContextMenu,
  };
}
