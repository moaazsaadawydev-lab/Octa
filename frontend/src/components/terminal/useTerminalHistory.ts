import { useState, useCallback } from 'react';
import { TerminalCommandBlock } from '../../types/terminalHistory';
import { getTerminalOutputLines } from './terminalRegistry';
import { parseTerminalBufferToBlocks } from './terminalHistoryParser';

export function useTerminalHistory() {
  const [blocks, setBlocks] = useState<TerminalCommandBlock[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadSessionHistory = useCallback((sessionId: string) => {
    if (!sessionId) {
      setBlocks([]);
      setSelectedIds(new Set());
      return;
    }

    const lines = getTerminalOutputLines(sessionId, 300);
    const parsed = parseTerminalBufferToBlocks(lines);
    setBlocks(parsed);

    // Default state: Pre-select only the most recent command block
    if (parsed.length > 0) {
      const mostRecent = parsed[parsed.length - 1];
      setSelectedIds(new Set([mostRecent.id]));
    } else {
      setSelectedIds(new Set());
    }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(blocks.map((b) => b.id)));
  }, [blocks]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    blocks,
    selectedIds,
    selectedCount: selectedIds.size,
    loadSessionHistory,
    toggleSelect,
    selectAll,
    deselectAll,
  };
}
