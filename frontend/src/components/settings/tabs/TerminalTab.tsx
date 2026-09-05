import React from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { AppSettings } from '../../../types/settings';
import { ShellInfo } from '../../../types/terminal';
import { SettingsRowCard, ToggleSwitch, SelectDropdown } from '../../common';

interface TerminalTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  availableShells?: ShellInfo[];
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  settings,
  onUpdateSettings,
  availableShells = [],
}) => {
  const shellOptions =
    availableShells.length > 0
      ? availableShells.map((s) => ({
        value: s.id,
        label: s.name,
        badge: s.id === 'powershell' ? 'Default' : undefined,
      }))
      : [
        { value: 'powershell', label: 'PowerShell', badge: 'Default' },
        { value: 'cmd', label: 'Command Prompt' },
      ];

  return (
    <div className="space-y-4">
      {/* 1. Default Shell Executable */}
      <SettingsRowCard
        icon={<TerminalIcon className="w-4 h-4 text-brand-500" />}
        title="Default Shell Executable"
        description="Choose the primary shell process launched when creating new terminal tabs"
      >
        <SelectDropdown
          value={settings.terminalShell || 'powershell'}
          onChange={(val) => onUpdateSettings({ ...settings, terminalShell: val })}
          options={shellOptions}
        />
      </SettingsRowCard>

      {/* 2. Terminal Font Size */}
      <SettingsRowCard
        title="Terminal Font Size"
        description="Configure the rendered text size in pixels across all terminal instances"
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={10}
            max={24}
            value={settings.terminalFontSize ?? 14}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 8 && val <= 32) {
                onUpdateSettings({ ...settings, terminalFontSize: val });
              }
            }}
            className="w-20 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono text-center shadow-2xs"
          />
          <span className="text-xs text-slate-400 dark:text-zinc-500">px</span>
        </div>
      </SettingsRowCard>

      {/* 3. Cursor Style */}
      <SettingsRowCard
        title="Cursor Style"
        description="Set the visual appearance and shape of the terminal caret"
      >
        <SelectDropdown
          value={settings.terminalCursorStyle || 'block'}
          onChange={(val) =>
            onUpdateSettings({
              ...settings,
              terminalCursorStyle: val as 'block' | 'underline' | 'bar',
            })
          }
          options={[
            { value: 'block', label: 'Block (Default)' },
            { value: 'bar', label: 'Line / Bar' },
            { value: 'underline', label: 'Underline' },
          ]}
        />
      </SettingsRowCard>

      {/* 4. Copy on Select */}
      <SettingsRowCard
        title="Copy on Select"
        description="Automatically copy selected terminal text to the system clipboard upon highlight"
      >
        <ToggleSwitch
          checked={Boolean(settings.terminalCopyOnSelect)}
          onChange={(checked) =>
            onUpdateSettings({ ...settings, terminalCopyOnSelect: checked })
          }
        />
      </SettingsRowCard>
    </div>
  );
};
