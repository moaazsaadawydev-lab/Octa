import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Terminal as TerminalIcon,
  Palette,
  Sparkles,
  Info,
  Keyboard,
  Boxes,
} from 'lucide-react';
import clsx from 'clsx';
import { AppSettings } from '../../types/settings';
import { ShellInfo } from '../../types/terminal';
import { getAvailableShells } from '../../services/api';
import {
  GeneralTab,
  TerminalTab,
  AppearanceTab,
  ShortcutsTab,
  AIEngineTab,
  DockerTab,
  AboutTab,
} from '../settings/tabs';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export type SettingsCategory = 'general' | 'shortcuts' | 'terminal' | 'appearance' | 'ai' | 'docker' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsCategory>('general');
  const [availableShells, setAvailableShells] = useState<ShellInfo[]>([
    { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' },
    { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
  ]);

  // Load host shells dynamically on mount / open
  useEffect(() => {
    if (isOpen) {
      getAvailableShells()
        .then((shells) => {
          if (Array.isArray(shells) && shells.length > 0) {
            setAvailableShells(shells);
          }
        })
        .catch((err) => console.warn('Failed to load shells:', err));
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const NAV_ITEMS = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
    { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
    { id: 'ai', label: 'AI Engine', icon: Sparkles },
    { id: 'docker', label: 'Docker Engine', icon: Boxes },
    { id: 'about', label: 'About Octa', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col h-[580px] overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-[#0f141c]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Preferences & Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Body (Sidebar + Content Area) */}
        <div className="flex flex-1 min-h-0">
          {/* Left Navigation Sidebar */}
          <div className="w-52 border-r border-slate-200 dark:border-zinc-800/80 p-2.5 space-y-1 bg-slate-50/50 dark:bg-[#090b10] flex-shrink-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as SettingsCategory)}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer rounded-lg',
                    isActive
                      ? 'bg-brand-50/80 dark:bg-[#161c26] text-brand-600 dark:text-white font-medium border-l-2 border-brand-500 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#161c26] border-l-2 border-transparent'
                  )}
                >
                  <Icon
                    className={clsx(
                      'w-4 h-4 flex-shrink-0',
                      isActive
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-slate-400 dark:text-zinc-500'
                    )}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Viewport */}
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar bg-white dark:bg-[#0d1117]">
            {activeTab === 'general' && (
              <GeneralTab
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                showToast={showToast}
              />
            )}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
            {activeTab === 'terminal' && (
              <TerminalTab
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                availableShells={availableShells}
              />
            )}
            {activeTab === 'appearance' && (
              <AppearanceTab settings={settings} onUpdateSettings={onUpdateSettings} />
            )}
            {activeTab === 'ai' && (
              <AIEngineTab
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                showToast={showToast}
              />
            )}
            {activeTab === 'docker' && (
              <DockerTab
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                showToast={showToast}
              />
            )}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
};
