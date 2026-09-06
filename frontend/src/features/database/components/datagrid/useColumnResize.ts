import { useState, useRef, useCallback } from 'react';

const MIN_COL_WIDTH = 130;
const DEFAULT_COL_WIDTH = 160;

export const useColumnResize = (initialWidths: Record<string, number> = {}) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);
  const activeColRef = useRef<{ colName: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback((colName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentWidth = columnWidths[colName] || DEFAULT_COL_WIDTH;
    activeColRef.current = { colName, startX: e.clientX, startWidth: currentWidth };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (me: MouseEvent) => {
      if (!activeColRef.current) return;
      const delta = me.clientX - activeColRef.current.startX;
      const newWidth = Math.max(MIN_COL_WIDTH, activeColRef.current.startWidth + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [activeColRef.current!.colName]: newWidth,
      }));
    };

    const onMouseUp = () => {
      activeColRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  const handleAutoFit = useCallback((colName: string, sampleText?: string) => {
    const textLen = (sampleText || colName).length;
    const approxWidth = Math.max(MIN_COL_WIDTH, Math.min(450, textLen * 9 + 64));
    setColumnWidths((prev) => ({
      ...prev,
      [colName]: approxWidth,
    }));
  }, []);

  return {
    columnWidths,
    handleResizeStart,
    handleAutoFit,
    setColumnWidths,
  };
};
