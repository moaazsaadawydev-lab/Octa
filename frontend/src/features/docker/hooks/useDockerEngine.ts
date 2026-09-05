import { useState, useEffect, useCallback, useRef } from 'react';
import { DockerEngineProvider } from '../../../types/docker';
import { AppSettings } from '../../../types/settings';
import {
  getDetectedDockerEngines,
  setDockerEngine,
  checkDockerStatus,
} from '../../../services/api';

const SETTINGS_STORAGE_KEY = 'octa_global_settings';

function getStoredDefaultEngine(): 'windows' | 'wsl' {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.docker_default_engine === 'wsl' || parsed.docker_default_engine === 'windows') {
        return parsed.docker_default_engine;
      }
    }
  } catch (e) {
    // ignore
  }
  return 'windows';
}

interface UseDockerEngineOptions {
  settings?: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
}

export function useDockerEngine(options?: UseDockerEngineOptions) {
  const { settings, onUpdateSettings } = options || {};

  const initialEngine = settings?.docker_default_engine || getStoredDefaultEngine();

  const [availableEngines, setAvailableEngines] = useState<DockerEngineProvider[]>([
    { id: initialEngine, label: initialEngine === 'wsl' ? 'WSL2 (Ubuntu)' : 'Docker Desktop (Windows)' },
  ]);
  const [activeEngine, setActiveEngineState] = useState<'windows' | 'wsl'>(initialEngine);
  const [activeDistro, setActiveDistro] = useState<string | undefined>(undefined);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoadingEngines, setIsLoadingEngines] = useState<boolean>(true);

  const activeEngineRef = useRef(activeEngine);
  activeEngineRef.current = activeEngine;

  // 1. Detect available engines on mount
  useEffect(() => {
    let isMounted = true;

    async function discoverEngines() {
      setIsLoadingEngines(true);
      try {
        const engines = await getDetectedDockerEngines();
        if (!isMounted) return;

        if (Array.isArray(engines) && engines.length > 0) {
          setAvailableEngines(engines);

          // Synchronize with preferred stored setting
          const preferred = settings?.docker_default_engine || getStoredDefaultEngine();
          const matched = engines.find((e) => e.id === preferred) || engines[0];
          const matchedId = (matched.id === 'wsl' ? 'wsl' : 'windows') as 'windows' | 'wsl';
          setActiveEngineState(matchedId);
          setActiveDistro(matched.distro);
          await setDockerEngine(matchedId, matched.distro || '');
        }
      } catch (e) {
        console.warn('[useDockerEngine] Detection error:', e);
      } finally {
        if (isMounted) setIsLoadingEngines(false);
      }
    }

    discoverEngines();
    return () => {
      isMounted = false;
    };
  }, [settings?.docker_default_engine]);

  // 2. Health check daemon responsiveness
  const refreshStatus = useCallback(async (targetEngine?: 'windows' | 'wsl') => {
    const engineToCheck = targetEngine || activeEngineRef.current;
    try {
      const online = await checkDockerStatus(engineToCheck);
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    refreshStatus(activeEngine);
  }, [activeEngine, refreshStatus]);

  // 3. Switch engine provider
  const switchEngine = useCallback(
    async (engineId: 'windows' | 'wsl') => {
      const target = availableEngines.find((e) => e.id === engineId);
      const distro = target?.distro || '';
      setActiveEngineState(engineId);
      setActiveDistro(distro);
      activeEngineRef.current = engineId;

      await setDockerEngine(engineId, distro);
      if (onUpdateSettings && settings) {
        onUpdateSettings({ ...settings, docker_default_engine: engineId });
      }

      await refreshStatus(engineId);
    },
    [availableEngines, onUpdateSettings, settings, refreshStatus]
  );

  // 4. Synchronize when external settings change (e.g. from Settings modal)
  useEffect(() => {
    const targetEngine = settings?.docker_default_engine;
    if (targetEngine && targetEngine !== activeEngineRef.current) {
      switchEngine(targetEngine);
    }
  }, [settings?.docker_default_engine, switchEngine]);

  // 5. Listen for custom settings changed event
  useEffect(() => {
    const handleSettingsChanged = (e: any) => {
      const updatedEngine = e?.detail?.docker_default_engine;
      if (updatedEngine && updatedEngine !== activeEngineRef.current) {
        switchEngine(updatedEngine);
      }
    };
    window.addEventListener('octa:settings:changed', handleSettingsChanged as EventListener);
    return () => {
      window.removeEventListener('octa:settings:changed', handleSettingsChanged as EventListener);
    };
  }, [switchEngine]);

  return {
    availableEngines,
    activeEngine,
    activeDistro,
    isOnline,
    isLoadingEngines,
    switchEngine,
    refreshStatus,
  };
}
