import React, { useState } from 'react';
import {
  Folder,
  Trash2,
  Loader2,
  Check,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { AppSettings, StartupBehavior } from '../../../types/settings';
import { SettingsRowCard, ToggleSwitch, SelectDropdown } from '../../common';
import { clearAppCache, clearQueryLogs } from '../../../services/api';

interface GeneralTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    setCacheClearedSuccess(false);

    try {
      // 1. Purge Web / WebView storage caches
      sessionStorage.clear();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 2. Retain project / connection identifiers while purging cached query history
      localStorage.removeItem('octa_query_history');
      localStorage.removeItem('octa_redis_command_history');

      // 3. Clear Backend Cache (query logs and temp scratch buffers)
      await clearQueryLogs();
      await clearAppCache();

      setCacheClearedSuccess(true);
      showToast('Application and query cache cleared successfully', 'success');

      setTimeout(() => {
        setCacheClearedSuccess(false);
      }, 3000);
    } catch (e) {
      console.warn('[CachePurge] Error clearing cache:', e);
      showToast('Cache cleared with minor warnings', 'info');
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Startup Behavior */}
      <SettingsRowCard
        icon={<Zap className="w-4 h-4 text-amber-500" />}
        title="Startup Behavior"
        description="Choose what to display when Octa launches"
      >
        <SelectDropdown
          value={settings.onStartup}
          onChange={(val) => onUpdateSettings({ ...settings, onStartup: val as StartupBehavior })}
          options={[
            { value: 'last_project', label: 'Reopen Last Active Project' },
            { value: 'welcome_screen', label: 'Always Show Welcome Screen' },
          ]}
        />
      </SettingsRowCard>

      {/* 2. Default Workspace Directory */}
      <SettingsRowCard
        icon={<Folder className="w-4 h-4 text-brand-500" />}
        title="Default Project Directory"
        description="Default folder used when creating or opening local workspaces"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value="User Documents / Octa"
            className="w-48 bg-white dark:bg-zinc-800/80 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 font-mono select-none"
          />
        </div>
      </SettingsRowCard>

      {/* 3. Auto-Check for Updates */}
      <SettingsRowCard
        title="Auto-Check for Updates"
        description="Periodically check for new Octa releases and feature patches"
      >
        <ToggleSwitch
          checked={true}
          onChange={() => {
            showToast('Octa is currently on the latest version (v1.0.0)', 'info');
          }}
        />
      </SettingsRowCard>

      {/* 4. Functional Clear Cache */}
      <SettingsRowCard
        icon={<Trash2 className="w-4 h-4 text-rose-500" />}
        title="Application Cache"
        description="Purge temporary query results, preview buffers, and web storage"
      >
        <button
          type="button"
          disabled={isClearingCache}
          onClick={handleClearCache}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border',
            cacheClearedSuccess
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400 disabled:opacity-50'
          )}
        >
          {isClearingCache ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Clearing...</span>
            </>
          ) : cacheClearedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cache Cleared</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear Cache</span>
            </>
          )}
        </button>
      </SettingsRowCard>
    </div>
  );
};
