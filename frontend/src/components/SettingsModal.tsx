import React, { useState } from 'react';
import {
  X,
  Settings,
  Flame,
  Layout,
  Command,
  Info,
  CheckCircle2,
  Folder,
  Sparkles,
  HardDrive,
  FileCode
} from 'lucide-react';
import { AppSettings, StartupBehavior } from '../types/settings';
import appIcon from '../assets/appicon.png';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans select-none">
      <div className="bg-[#141416] border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#18181b]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Preferences</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Configure Octa workspace behavior and environment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body with Left Nav Tabs & Right Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tabs Nav */}
          <div className="w-48 border-r border-zinc-800 bg-[#111114] p-3 space-y-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
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
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
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
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About Octa</span>
            </button>
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#141416]">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* On Startup Section */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Startup Behavior
                  </div>
                  <p className="text-xs text-zinc-400 mb-3.5">
                    Choose what to show when Octa application launches.
                  </p>

                  <div className="space-y-2.5">
                    {/* Option 1: Reopen Last Project */}
                    <div
                      onClick={() => handleStartupChange('last_project')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        settings.onStartup === 'last_project'
                          ? 'bg-brand-600/10 border-brand-500/40 text-zinc-100 ring-1 ring-brand-500/30'
                          : 'bg-[#18181c] border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-[#1c1c20]'
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
                        <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                          <span>Reopen Last Project</span>
                          {settings.onStartup === 'last_project' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                          Automatically loads the most recently active <code className="text-brand-400 font-mono">.octa</code> workspace on startup.
                        </p>
                        {settings.lastOpenedProjectFilePath && (
                          <div className="mt-2 text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1 bg-[#121215] px-2 py-1 rounded border border-zinc-800/80">
                            <Folder className="w-3 h-3 text-zinc-400 flex-shrink-0" />
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
                          ? 'bg-brand-600/10 border-brand-500/40 text-zinc-100 ring-1 ring-brand-500/30'
                          : 'bg-[#18181c] border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-[#1c1c20]'
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
                        <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                          <span>Welcome Screen</span>
                          {settings.onStartup === 'welcome_screen' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                          Always start on the Welcome Screen to create a new project or select from your recent files.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Format Info */}
                <div className="p-3.5 rounded-xl bg-[#18181c] border border-zinc-800 text-xs space-y-1.5">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>Native .octa File System</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    All workspace mutations (databases, queries, Redis configurations, HTTP collections, and environments) are saved directly to your active <code className="text-cyan-400 font-mono">.octa</code> file.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Global Keyboard Shortcuts
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'Ctrl + S', desc: 'Save Active Project File' },
                    { key: 'Ctrl + 1', desc: 'Switch to Databases Workspace' },
                    { key: 'Ctrl + 2', desc: 'Switch to Redis Cache Explorer' },
                    { key: 'Ctrl + 3', desc: 'Switch to HTTP / API Client' },
                    { key: 'Ctrl + ,', desc: 'Open Preferences / Settings' },
                    { key: 'Ctrl + Enter', desc: 'Execute SQL Query in Playground' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] border border-zinc-800/80 text-xs"
                    >
                      <span className="text-zinc-300">{s.desc}</span>
                      <kbd className="px-2 py-1 rounded bg-[#101013] border border-zinc-700 font-mono text-[11px] font-semibold text-brand-400 shadow-sm">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto shadow-xl p-2">
                  <img src={appIcon} alt="Octa" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Octa Developer Hub</h3>
                  <p className="text-xs text-brand-400 font-mono mt-0.5">Version 2.0.0 (File-Centric Edition)</p>
                </div>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  High-performance desktop developer tool engineered with Go, Wails, React, and Monaco for multi-engine Database management, Redis caching, and API exploration.
                </p>
                <div className="pt-2 text-[11px] text-zinc-500 font-mono">
                  Engineered with ❤️ for modern software development.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-[#18181b]/60 flex-shrink-0">
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
