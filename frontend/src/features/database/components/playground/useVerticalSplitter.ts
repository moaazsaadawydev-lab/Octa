import { useState, useRef, useCallback } from 'react';

const MIN_EDITOR_HEIGHT = 200;
const MIN_RESULTS_HEIGHT = 220;
const DEFAULT_RESULTS_HEIGHT = 260;

export function useVerticalSplitter() {
  const [resultsHeight, setResultsHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('octa_playground_results_height');
      const parsed = saved ? parseInt(saved, 10) : DEFAULT_RESULTS_HEIGHT;
      return isNaN(parsed) ? DEFAULT_RESULTS_HEIGHT : Math.max(MIN_RESULTS_HEIGHT, parsed);
    } catch {
      return DEFAULT_RESULTS_HEIGHT;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      startY: e.clientY,
      startHeight: resultsHeight,
    };
    setIsDragging(true);

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaY = dragRef.current.startY - moveEvent.clientY;
      const containerHeight = containerRef.current?.clientHeight || 600;
      const maxResults = Math.max(MIN_RESULTS_HEIGHT, containerHeight - MIN_EDITOR_HEIGHT);

      const nextHeight = Math.min(
        maxResults,
        Math.max(MIN_RESULTS_HEIGHT, dragRef.current.startHeight + deltaY)
      );

      setResultsHeight(nextHeight);
      try {
        localStorage.setItem('octa_playground_results_height', String(nextHeight));
      } catch {}
    };

    const onMouseUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [resultsHeight]);

  return {
    resultsHeight,
    containerRef,
    handleSplitterMouseDown,
    isDragging,
  };
}
