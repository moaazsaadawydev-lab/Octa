import React from 'react';
import { FileCode, Save, Type, WrapText, Indent } from 'lucide-react';
import { AppSettings } from '../../../types/settings';
import { SettingsRowCard, ToggleSwitch, SelectDropdown } from '../../common';

interface EditorTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const EditorTab: React.FC<EditorTabProps> = ({ settings, onUpdateSettings }) => {
  const autoSaveOptions = [
    { value: 'afterDelay', label: 'After Delay (Auto-save after 1s)' },
    { value: 'onFocusChange', label: 'On Focus Change (Auto-save on blur)' },
    { value: 'off', label: 'Off (Manual save with Ctrl+S)' },
  ];

  const tabSizeOptions = [
    { value: '2', label: '2 Spaces' },
    { value: '4', label: '4 Spaces' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Auto Save */}
      <SettingsRowCard
        icon={<Save className="w-4 h-4 text-brand-500" />}
        title="Auto Save"
        description="Controls how dirty/modified files are automatically saved to disk"
      >
        <SelectDropdown
          value={settings.editorAutoSave || 'afterDelay'}
          onChange={(val) =>
            onUpdateSettings({
              ...settings,
              editorAutoSave: val as 'off' | 'afterDelay' | 'onFocusChange',
            })
          }
          options={autoSaveOptions}
        />
      </SettingsRowCard>

      {/* 2. Editor Font Size */}
      <SettingsRowCard
        icon={<Type className="w-4 h-4 text-brand-500" />}
        title="Editor Font Size"
        description="Rendered text size in pixels across the code editor"
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={10}
            max={28}
            value={settings.editorFontSize ?? 14}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 10 && val <= 32) {
                onUpdateSettings({ ...settings, editorFontSize: val });
              }
            }}
            className="w-20 bg-white dark:bg-[#0a0d13] border border-slate-300 dark:border-zinc-800/80 text-slate-800 dark:text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono text-center shadow-2xs"
          />
          <span className="text-xs text-slate-400 dark:text-zinc-500">px</span>
        </div>
      </SettingsRowCard>

      {/* 3. Word Wrap */}
      <SettingsRowCard
        icon={<WrapText className="w-4 h-4 text-brand-500" />}
        title="Word Wrap"
        description="Controls whether long code lines should wrap or require horizontal scrolling"
      >
        <ToggleSwitch
          checked={settings.editorWordWrap !== 'off'}
          onChange={(checked) =>
            onUpdateSettings({
              ...settings,
              editorWordWrap: checked ? 'on' : 'off',
            })
          }
        />
      </SettingsRowCard>

      {/* 4. Tab Size */}
      <SettingsRowCard
        icon={<Indent className="w-4 h-4 text-brand-500" />}
        title="Tab Size"
        description="The number of spaces equal to a tab character"
      >
        <SelectDropdown
          value={String(settings.editorTabSize || 2)}
          onChange={(val) =>
            onUpdateSettings({
              ...settings,
              editorTabSize: parseInt(val, 10) || 2,
            })
          }
          options={tabSizeOptions}
        />
      </SettingsRowCard>

      {/* 5. Theme Info */}
      <SettingsRowCard
        icon={<FileCode className="w-4 h-4 text-brand-500" />}
        title="Syntax Highlighting Theme"
        description="Active palette for TypeScript, JavaScript, HTML, CSS, and Python"
      >
        <div className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
          Dark 2026 (Monarch Enhanced)
        </div>
      </SettingsRowCard>
    </div>
  );
};
