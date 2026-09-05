import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';
import { clearAppCache, clearQueryLogs } from '../services/api';

const SETTINGS_STORAGE_KEY = 'octa_global_settings';

export function usePreferences() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_APP_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('[usePreferences] Failed to parse app settings from localStorage:', e);
    }
    return DEFAULT_APP_SETTINGS;
  });

  // Persist settings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('[usePreferences] Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  // Synchronize dynamic document classes for compact mode and font ligatures
  useEffect(() => {
    const isCompact = Boolean(settings.compactMode);
    const hasLigatures = Boolean(
      (settings.editorFontLigatures ?? settings.editorLigatures) ?? true
    );

    document.documentElement.classList.toggle('compact-mode', isCompact);
    document.documentElement.classList.toggle('compact', isCompact);
    document.body.classList.toggle('compact-mode', isCompact);
    document.body.classList.toggle('compact', isCompact);

    document.documentElement.classList.toggle('ligatures-enabled', hasLigatures);
    document.documentElement.classList.toggle('ligatures-disabled', !hasLigatures);
    document.body.classList.toggle('ligatures-enabled', hasLigatures);
    document.body.classList.toggle('ligatures-disabled', !hasLigatures);
  }, [settings.compactMode, settings.editorFontLigatures, settings.editorLigatures]);

  // Update Settings (merges partial or complete settings object)
  const updateSettings = useCallback((newSettings: Partial<AppSettings> | AppSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Flush all temporary frontend and backend caches
  const purgeCaches = useCallback(async () => {
    sessionStorage.clear();
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    localStorage.removeItem('octa_query_history');
    localStorage.removeItem('octa_redis_command_history');
    await clearQueryLogs();
    await clearAppCache();
  }, []);

  return {
    settings,
    updateSettings,
    purgeCaches,
  };
}
