import { useState, useRef, useEffect, useCallback } from 'react';
import { startDockerEngine, checkDockerStatus } from '../../../services/api';

interface UseDockerEngineLauncherOptions {
  onSuccess?: () => void | Promise<void>;
  pollIntervalMs?: number;
  timeoutMs?: number;
  activeEngine?: string;
  activeDistro?: string;
}

export function useDockerEngineLauncher(options?: UseDockerEngineLauncherOptions) {
  const {
    onSuccess,
    pollIntervalMs = 3000,
    timeoutMs = 90000,
    activeEngine = 'windows',
    activeDistro = '',
  } = options || {};

  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const activeEngineRef = useRef(activeEngine);
  const activeDistroRef = useRef(activeDistro);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    activeEngineRef.current = activeEngine;
    activeDistroRef.current = activeDistro;
  }, [activeEngine, activeDistro]);

  const clearTimers = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const startEngine = useCallback(async () => {
    clearTimers();
    setError(null);
    setIsStarting(true);

    const targetEngine = activeEngineRef.current;
    const targetDistro = activeDistroRef.current;

    try {
      await startDockerEngine(targetEngine, targetDistro);
    } catch (err: any) {
      setIsStarting(false);
      const msg = err?.message || 'Failed to start Docker Engine';
      setError(msg);
      return;
    }

    // Set 90s timeout safeguard
    timeoutRef.current = window.setTimeout(() => {
      clearTimers();
      setIsStarting(false);
      setError('Docker Engine startup timed out. Please check Docker service manually.');
    }, timeoutMs);

    // Start polling interval
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const isOnline = await checkDockerStatus(targetEngine);
        if (isOnline) {
          clearTimers();
          setIsStarting(false);
          setError(null);
          if (onSuccessRef.current) {
            await onSuccessRef.current();
          }
        }
      } catch (err) {
        // Transient error during engine boot; continue polling until timeout
      }
    }, pollIntervalMs);
  }, [clearTimers, pollIntervalMs, timeoutMs]);

  return {
    isStarting,
    error,
    startEngine,
    clearError: () => setError(null),
  };
}
