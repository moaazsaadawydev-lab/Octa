import React from 'react';
import { Sun, Moon, Monitor, Palette, FileCode } from 'lucide-react';
import clsx from 'clsx';
import { AppSettings, ThemeMode } from '../../../types/settings';
import { useTheme } from '../../../context/ThemeContext';
import { SettingsRowCard, ToggleSwitch } from '../../common';

interface AppearanceTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    onUpdateSettings({ ...settings, theme: mode });
  };

  const isCompact = Boolean(settings.compactMode);
  const hasLigatures = Boolean(
    (settings.editorFontLigatures ?? settings.editorLigatures) ?? true
  );

  return (
    <div className="space-y-4">
      {/* 1. Theme Selector */}
      <div className="p-4 bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
            Interface Theme
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Select your visual aesthetic preference across the application workspace
        </p>
        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'system', label: 'System Sync', icon: Monitor },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleThemeChange(item.id as ThemeMode)}
                className={clsx(
                  'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all gap-2 cursor-pointer shadow-2xs',
                  isSelected
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Compact Mode Toggle */}
      <SettingsRowCard
        title="Compact Mode"
        description="Decrease padding and density across navigation bars, trees, and table grids"
      >
        <ToggleSwitch
          checked={isCompact}
          onChange={(checked) => onUpdateSettings({ ...settings, compactMode: checked })}
        />
      </SettingsRowCard>

      {/* 3. Editor Font Ligatures Toggle */}
      <SettingsRowCard
        icon={<FileCode className="w-4 h-4 text-indigo-500" />}
        title="Editor Font Ligatures"
        description="Enable typographical glyph ligatures (such as =>, !=, ===) in SQL and code editors"
      >
        <ToggleSwitch
          checked={hasLigatures}
          onChange={(checked) =>
            onUpdateSettings({
              ...settings,
              editorFontLigatures: checked,
              editorLigatures: checked,
            })
          }
        />
      </SettingsRowCard>
    </div>
  );
};
