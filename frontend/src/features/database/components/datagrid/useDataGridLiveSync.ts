import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseDataGridLiveSyncOptions {
  onRefresh?: () => void;
  loading?: boolean;
  hasPendingEdits?: boolean;
  intervalMs?: number;
}

export function useDataGridLiveSync({
  onRefresh,
  loading = false,
  hasPendingEdits = false,
  intervalMs = 3000,
}: UseDataGridLiveSyncOptions) {
  const [isLiveSync, setIsLiveSync] = useState<boolean>(() => {
    return localStorage.getItem('octa_db_live_sync') === 'true';
  });

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const hasPendingEditsRef = useRef(hasPendingEdits);
  hasPendingEditsRef.current = hasPendingEdits;

  const toggleLiveSync = useCallback(() => {
    setIsLiveSync((prev) => {
      const next = !prev;
      localStorage.setItem('octa_db_live_sync', String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+R / F5 for manual re-read
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'r') || e.key === 'F5') {
        e.preventDefault();
        onRefreshRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live auto-refresh polling
  useEffect(() => {
    if (!isLiveSync || !onRefresh) return;

    const timer = setInterval(() => {
      if (document.hidden) return;
      if (loadingRef.current || hasPendingEditsRef.current) return;
      onRefreshRef.current?.();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isLiveSync, onRefresh, intervalMs]);

  return {
    isLiveSync,
    toggleLiveSync,
  };
}
