import type { Terminal } from '@xterm/xterm';

const terminalMap = new Map<string, Terminal>();

/**
 * Registers an active xterm instance by its unique session ID.
 */
export function registerTerminal(sessionId: string, term: Terminal): void {
  terminalMap.set(sessionId, term);
}

/**
 * Unregisters an xterm instance upon teardown.
 */
export function unregisterTerminal(sessionId: string): void {
  terminalMap.delete(sessionId);
}

/**
 * Extracts recent lines of text from the active terminal buffer.
 */
export function getTerminalOutput(sessionId: string, maxLines: number = 80): string {
  const term = terminalMap.get(sessionId);
  if (!term) return '';

  const buffer = term.buffer.active;
  if (!buffer || buffer.length === 0) return '';

  const lines: string[] = [];
  const startLine = Math.max(0, buffer.length - maxLines);

  for (let i = startLine; i < buffer.length; i++) {
    const line = buffer.getLine(i);
    if (line) {
      lines.push(line.translateToString(true));
    }
  }

  // Remove trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return lines.join('\n').trim();
}

/**
 * Extracts raw lines array from the active terminal buffer.
 */
export function getTerminalOutputLines(sessionId: string, maxLines: number = 300): string[] {
  const term = terminalMap.get(sessionId);
  if (!term) return [];

  const buffer = term.buffer.active;
  if (!buffer || buffer.length === 0) return [];

  const lines: string[] = [];
  const startLine = Math.max(0, buffer.length - maxLines);

  for (let i = startLine; i < buffer.length; i++) {
    const line = buffer.getLine(i);
    if (line) {
      lines.push(line.translateToString(true));
    }
  }

  return lines;
}

