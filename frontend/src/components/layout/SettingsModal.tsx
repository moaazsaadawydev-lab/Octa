import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Layout,
  Command,
  Info,
  Folder,
  FileCode,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette
} from 'lucide-react';
import { AppSettings, StartupBehavior, ThemeMode } from '../../types/settings';
import { useTheme } from '../../context/ThemeContext';
import appIcon from '../../assets/appicon.png';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'shortcuts' | 'about'>('general');
  const { theme, setTheme } = useTheme();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    const updated: AppSettings = {
      ...settings,
      theme: newTheme,
    };
    onUpdateSettings(updated);
    showToast(
      newTheme === 'system'
        ? 'Theme set to System Default'
        : `Theme switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode`,
      'success'
    );
  };

  const handleStartupChange = (value: StartupBehavior) => {
    const updated: AppSettings = {
      ...settings,
      onStartup: value,
    };
    onUpdateSettings(updated);
    showToast(
      value === 'last_project'
        ? 'Octa will reopen your last active project on startup'
        : 'Octa will always open the Welcome Screen on startup',
      'success'
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[560px] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#18181b]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Preferences</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Configure Octa workspace behavior, theme, and environment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body with Left Nav Tabs & Right Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tabs Nav */}
          <div className="w-48 border-r border-slate-200 dark:border-zinc-800 bg-slate-100/60 dark:bg-[#111114] p-3 space-y-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-brand-600/10 dark:bg-brand-600/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>General</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'shortcuts'
                  ? 'bg-brand-600/10 dark:bg-brand-600/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Command className="w-4 h-4" />
              <span>Keyboard Shortcuts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-brand-600/10 dark:bg-brand-600/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About Octa</span>
            </button>
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-[#141416]">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* 1. Appearance / Theme Section */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-brand-500" />
                    <span>Appearance & Theme</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3.5">
                    Choose your interface color scheme and Monaco Editor palette.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Dark Theme Card */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        theme === 'dark'
                          ? 'bg-brand-600/10 border-brand-500 text-slate-900 dark:text-zinc-100 ring-2 ring-brand-500/20 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#18181c] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-lg bg-zinc-900 text-sky-400 border border-zinc-700">
                            <Moon className="w-4 h-4" />
                          </div>
                          {theme === 'dark' && (
                            <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Dark Mode</div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Charcoal & deep zinc palette</p>
                      </div>
                    </button>

                    {/* Light Theme Card */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        theme === 'light'
                          ? 'bg-brand-600/10 border-brand-500 text-slate-900 dark:text-zinc-100 ring-2 ring-brand-500/20 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#18181c] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-lg bg-amber-50 text-amber-500 border border-amber-200">
                            <Sun className="w-4 h-4" />
                          </div>
                          {theme === 'light' && (
                            <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Light Mode</div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">High-contrast light slate palette</p>
                      </div>
                    </button>

                    {/* System Theme Card */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('system')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        theme === 'system'
                          ? 'bg-brand-600/10 border-brand-500 text-slate-900 dark:text-zinc-100 ring-2 ring-brand-500/20 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#18181c] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            <Monitor className="w-4 h-4" />
                          </div>
                          {theme === 'system' && (
                            <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">System</div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Syncs with OS preferences</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Startup Behavior Section */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                    Startup Behavior
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3.5">
                    Choose what to show when Octa application launches.
                  </p>

                  <div className="space-y-2.5">
                    {/* Option 1: Reopen Last Project */}
                    <div
                      onClick={() => handleStartupChange('last_project')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        settings.onStartup === 'last_project'
                          ? 'bg-brand-600/10 border-brand-500/40 text-slate-900 dark:text-zinc-100 ring-1 ring-brand-500/30'
                          : 'bg-slate-50 dark:bg-[#18181c] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="onStartup"
                        checked={settings.onStartup === 'last_project'}
                        onChange={() => handleStartupChange('last_project')}
                        className="mt-1 accent-brand-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>Reopen Last Project</span>
                          {settings.onStartup === 'last_project' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-600 dark:text-brand-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Automatically loads the most recently active <code className="text-brand-500 dark:text-brand-400 font-mono">.octa</code> workspace on startup.
                        </p>
                        {settings.lastOpenedProjectFilePath && (
                          <div className="mt-2 text-[10px] font-mono text-slate-600 dark:text-zinc-500 truncate flex items-center gap-1 bg-slate-100 dark:bg-[#121215] px-2 py-1 rounded border border-slate-200 dark:border-zinc-800/80">
                            <Folder className="w-3 h-3 text-slate-400 dark:text-zinc-400 flex-shrink-0" />
                            <span className="truncate">{settings.lastOpenedProjectFilePath}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Option 2: Always Welcome Screen */}
                    <div
                      onClick={() => handleStartupChange('welcome_screen')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        settings.onStartup === 'welcome_screen'
                          ? 'bg-brand-600/10 border-brand-500/40 text-slate-900 dark:text-zinc-100 ring-1 ring-brand-500/30'
                          : 'bg-slate-50 dark:bg-[#18181c] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="onStartup"
                        checked={settings.onStartup === 'welcome_screen'}
                        onChange={() => handleStartupChange('welcome_screen')}
                        className="mt-1 accent-brand-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>Welcome Screen</span>
                          {settings.onStartup === 'welcome_screen' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-600 dark:text-brand-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Always start on the Welcome Screen to create a new project or select from your recent files.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Format Info */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 text-xs space-y-1.5">
                  <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                    <span>Native .octa File System</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    All workspace mutations (databases, queries, Redis configurations, HTTP collections, and environments) are saved directly to your active <code className="text-cyan-600 dark:text-cyan-400 font-mono">.octa</code> file.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                  Global Keyboard Shortcuts
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'Ctrl + S', desc: 'Save Active Project File' },
                    { key: 'Ctrl + 1', desc: 'Switch to Databases Workspace' },
                    { key: 'Ctrl + 2', desc: 'Switch to Redis Cache Explorer' },
                    { key: 'Ctrl + 3', desc: 'Switch to HTTP / API Client' },
                    { key: 'Ctrl + ,', desc: 'Open Preferences / Settings' },
                    { key: 'Ctrl + Enter', desc: 'Execute SQL Query or Redis Command' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800/80 text-xs"
                    >
                      <span className="text-slate-700 dark:text-zinc-300">{s.desc}</span>
                      <kbd className="px-2 py-1 rounded bg-slate-200 dark:bg-[#101013] border border-slate-300 dark:border-zinc-700 font-mono text-[11px] font-semibold text-brand-600 dark:text-brand-400 shadow-sm">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center mx-auto shadow-xl p-2">
                  <img src={appIcon} alt="Octa" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Octa Developer Hub</h3>
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-mono mt-0.5">Version 2.0.0 (Theme & Workbench Edition)</p>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  High-performance desktop developer tool engineered with Go, Wails, React, and Monaco for multi-engine Database management, Redis caching, and API exploration.
                </p>
                <div className="pt-2 text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                  Engineered with ❤️ for modern software development.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#18181b]/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
