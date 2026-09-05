import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Terminal as TerminalIcon,
  Palette,
  Sparkles,
  Info,
  Folder,
  Sun,
  Moon,
  Monitor,
  Check,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Shield,
  FileCode,
  Zap,
  Loader2,
  Keyboard,
  Search
} from 'lucide-react';
import clsx from 'clsx';
import { AppSettings, StartupBehavior, ThemeMode } from '../../types/settings';
import { useTheme } from '../../context/ThemeContext';
import { clearQueryLogs } from '../../services/api';
import { ALL_SHORTCUT_GROUPS } from '../../constants/shortcuts';
import appIcon from '../../assets/appicon.png';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SettingsCategory = 'general' | 'shortcuts' | 'terminal' | 'appearance' | 'ai' | 'about';

// --- Subcomponents ---

// Shortcut badge renderer
const KbdBadge: React.FC<{ keys: string[] }> = ({ keys }) => (
  <div className="flex items-center gap-1">
    {keys.map((k, i) => (
      <React.Fragment key={i}>
        <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono text-[11px] text-slate-800 dark:text-zinc-200 font-semibold shadow-xs">
          {k}
        </kbd>
        {i < keys.length - 1 && <span className="text-slate-400 dark:text-zinc-600 text-xs font-semibold">+</span>}
      </React.Fragment>
    ))}
  </div>
);


// Modern Toggle Switch
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}> = ({ checked, onChange, id }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={clsx(
      'w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40',
      checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-zinc-700'
    )}
  >
    <div
      className={clsx(
        'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
  </button>
);

// Settings Row Card
const SettingCard: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, children, icon }) => (
  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 rounded-xl transition-all hover:border-slate-300 dark:hover:border-zinc-700/80 gap-4">
    <div className="flex items-start gap-3 min-w-0 pr-2">
      {icon && (
        <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">{title}</div>
        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</div>
      </div>
    </div>
    <div className="flex-shrink-0 flex items-center">{children}</div>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsCategory>('general');
  const [showApiKey, setShowApiKey] = useState(false);
  const [shortcutSearch, setShortcutSearch] = useState('');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
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

  // Settings update helper
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated: AppSettings = {
      ...settings,
      [key]: value,
    };
    onUpdateSettings(updated);
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    updateSetting('theme', newTheme);
    showToast(
      newTheme === 'system'
        ? 'Theme set to System Default'
        : `Theme switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode`,
      'success'
    );
  };

  const handleClearCache = async () => {
    if (isClearingCache) return;
    setIsClearingCache(true);
    try {
      // 1. Purge backend buffered query logs
      try {
        await clearQueryLogs();
      } catch (e) {
        console.warn('[CachePurge] Backend clearQueryLogs error:', e);
      }

      // 2. Clear sessionStorage
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('[CachePurge] sessionStorage clear error:', e);
      }

      // 3. Clear CacheStorage API if available in WebView
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((key) => window.caches.delete(key)));
        } catch (e) {
          console.warn('[CachePurge] window.caches delete error:', e);
        }
      }

      // 4. Purge volatile localStorage items while preserving critical settings & projects
      try {
        const preservedKeys = [
          'octa_global_settings',
          'octa_recent_projects',
          'octa_theme',
        ];
        const preserved: Record<string, string> = {};
        preservedKeys.forEach((key) => {
          const val = localStorage.getItem(key);
          if (val !== null) preserved[key] = val;
        });

        // Clear all localStorage
        localStorage.clear();

        // Restore preserved critical configuration
        Object.entries(preserved).forEach(([key, val]) => {
          localStorage.setItem(key, val);
        });
      } catch (e) {
        console.warn('[CachePurge] localStorage clear error:', e);
      }

      // Brief pause for visual smoothness
      await new Promise((resolve) => setTimeout(resolve, 350));

      setCacheClearedSuccess(true);
      showToast('Cache cleared successfully', 'success');
      setTimeout(() => setCacheClearedSuccess(false), 2500);
    } catch (err: any) {
      showToast('Failed to clear cache: ' + (err?.message || err), 'error');
    } finally {
      setIsClearingCache(false);
    }
  };

  const CATEGORIES = [
    { id: 'general' as const, label: 'General', icon: Sliders, subtitle: 'App startup behavior, workspace caching, and storage' },
    { id: 'shortcuts' as const, label: 'Keyboard Shortcuts', icon: Keyboard, subtitle: 'Global hotkeys and productivity shortcuts cheat sheet' },
    { id: 'terminal' as const, label: 'Terminal', icon: TerminalIcon, subtitle: 'ConPTY shell configuration, typography, and shortcuts' },
    { id: 'appearance' as const, label: 'Appearance & Theme', icon: Palette, subtitle: 'Interface themes, color palette, and visual density' },
    { id: 'ai' as const, label: 'AI / Engine', icon: Sparkles, subtitle: 'Machine learning assistants, model providers, and API credentials' },
    { id: 'about' as const, label: 'About & Updates', icon: Info, subtitle: 'Octa version details, system architecture, and project links' },
  ];

  const currentCategory = CATEGORIES.find((c) => c.id === activeTab)!;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 p-4 font-sans select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 rounded-2xl w-[860px] max-w-[95vw] h-[580px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-[#14151b]/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-600/10 dark:bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Octa Preferences</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">Configure global workspace preferences and environment options</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Column Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar (~220px) */}
          <div className="w-[220px] flex-shrink-0 border-r border-slate-200 dark:border-zinc-800/80 bg-slate-100/60 dark:bg-[#0c0d12] p-3 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveTab(cat.id)}
                    className={clsx(
                      'w-full px-3 py-2.5 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-all cursor-pointer',
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/60 dark:hover:bg-zinc-800/50'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500 dark:text-zinc-400')} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sidebar Bottom Badge */}
            <div className="p-3 rounded-xl bg-slate-200/50 dark:bg-zinc-900/60 border border-slate-300/40 dark:border-zinc-800/60 text-[11px] text-slate-500 dark:text-zinc-400">
              <div className="font-semibold text-slate-700 dark:text-zinc-300">Octa Workspace</div>
              <div className="text-[10px] mt-0.5 text-slate-400 dark:text-zinc-500">Theme & Workbench v2.0.0</div>
            </div>
          </div>

          {/* Right Panel (Active Category Content) */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#101116]">
            {/* Fixed Category Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800/60 bg-slate-50/40 dark:bg-[#14151b]/40 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{currentCategory.label}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{currentCategory.subtitle}</p>
            </div>

            {/* Scrollable Settings Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3.5">
              {/* 1. GENERAL CATEGORY */}
              {activeTab === 'general' && (
                <>
                  <SettingCard
                    title="Startup Behavior"
                    description="Choose what Octa presents when the application launches."
                  >
                    <select
                      value={settings.onStartup || 'last_project'}
                      onChange={(e) => updateSetting('onStartup', e.target.value as StartupBehavior)}
                      className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value="last_project">Reopen Last Active Project</option>
                      <option value="welcome_screen">Always Show Welcome Screen</option>
                    </select>
                  </SettingCard>

                  {settings.lastOpenedProjectFilePath && (
                    <div className="p-3 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                        <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400 truncate">
                          {settings.lastOpenedProjectFilePath}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 flex-shrink-0">
                        Last Active
                      </span>
                    </div>
                  )}

                  <SettingCard
                    title="Clear Application Cache"
                    description="Purge temporary query execution history, buffered previews, and web storage caches."
                  >
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={isClearingCache}
                      className={clsx(
                        'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
                        cacheClearedSuccess
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      )}
                    >
                      {isClearingCache ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : cacheClearedSuccess ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isClearingCache
                          ? 'Clearing...'
                          : cacheClearedSuccess
                          ? 'Cleared!'
                          : 'Clear Cache'}
                      </span>
                    </button>
                  </SettingCard>
                </>
              )}

              {/* KEYBOARD SHORTCUTS CATEGORY */}
              {activeTab === 'shortcuts' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      placeholder="Search shortcuts by action name or key..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/80 rounded-xl text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                  </div>

                  {/* Grouped Shortcuts */}
                  {ALL_SHORTCUT_GROUPS
                    .map((group) => {
                      const filtered = group.items.filter(
                        (it) =>
                          it.label.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
                          it.keys.some((k) => k.toLowerCase().includes(shortcutSearch.toLowerCase()))
                      );
                      if (filtered.length === 0) return null;
                      return (
                        <div key={group.category} className="space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1 font-mono">
                            {group.category}
                          </div>
                          <div className="space-y-1.5">
                            {filtered.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 text-xs"
                              >
                                <span className="font-medium text-slate-800 dark:text-zinc-200">{item.label}</span>
                                <KbdBadge keys={item.keys} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean)}
                </div>
              )}

              {/* 2. TERMINAL CATEGORY */}
              {activeTab === 'terminal' && (
                <>
                  <SettingCard
                    title="Default Shell Executable"
                    description="Default command shell to launch inside interactive ConPTY sessions."
                  >
                    <select
                      value={settings.terminalShell || 'powershell'}
                      onChange={(e) => updateSetting('terminalShell', e.target.value)}
                      className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value="powershell">PowerShell (powershell.exe)</option>
                      <option value="pwsh">PowerShell Core (pwsh.exe)</option>
                      <option value="cmd">Command Prompt (cmd.exe)</option>
                    </select>
                  </SettingCard>

                  <SettingCard
                    title="Font Size (Pixels)"
                    description="Typography scale for xterm.js terminal viewports."
                  >
                    <select
                      value={settings.terminalFontSize || 14}
                      onChange={(e) => updateSetting('terminalFontSize', Number(e.target.value))}
                      className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value={12}>12 px (Compact)</option>
                      <option value={13}>13 px</option>
                      <option value={14}>14 px (Default)</option>
                      <option value={16}>16 px</option>
                      <option value={18}>18 px (Large)</option>
                      <option value={20}>20 px (Extra Large)</option>
                    </select>
                  </SettingCard>

                  <SettingCard
                    title="Cursor Style"
                    description="Visual appearance of the active terminal cursor."
                  >
                    <select
                      value={settings.terminalCursorStyle || 'block'}
                      onChange={(e) => updateSetting('terminalCursorStyle', e.target.value as any)}
                      className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value="block">Block (█)</option>
                      <option value="underline">Underline (_)</option>
                      <option value="bar">Line / Bar (|)</option>
                    </select>
                  </SettingCard>

                  <SettingCard
                    title="Copy on Select"
                    description="Automatically copy highlighted terminal text to clipboard upon selection."
                  >
                    <ToggleSwitch
                      checked={settings.terminalCopyOnSelect ?? false}
                      onChange={(checked) => updateSetting('terminalCopyOnSelect', checked)}
                    />
                  </SettingCard>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-xs space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Windows Terminal Fast Shortcuts</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Press <kbd className="font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-[10px]">Ctrl+C</kbd> with highlighted text to copy without stopping commands, or right-click to quick-paste at cursor.
                    </p>
                  </div>
                </>
              )}

              {/* 3. APPEARANCE CATEGORY */}
              {activeTab === 'appearance' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Interface Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Dark */}
                      <button
                        type="button"
                        onClick={() => handleThemeChange('dark')}
                        className={clsx(
                          'p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between',
                          theme === 'dark'
                            ? 'bg-brand-600/10 border-brand-500 text-slate-900 dark:text-zinc-100 ring-2 ring-brand-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-zinc-900 text-sky-400 border border-zinc-700">
                              <Moon className="w-4 h-4" />
                            </div>
                            {theme === 'dark' && (
                              <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-white">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-semibold">Dark Mode</div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Charcoal & deep zinc palette</p>
                        </div>
                      </button>

                      {/* Light */}
                      <button
                        type="button"
                        onClick={() => handleThemeChange('light')}
                        className={clsx(
                          'p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between',
                          theme === 'light'
                            ? 'bg-brand-600/10 border-brand-500 text-slate-900 dark:text-zinc-100 ring-2 ring-brand-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-amber-50 text-amber-500 border border-amber-200">
                              <Sun className="w-4 h-4" />
                            </div>
                            {theme === 'light' && (
                              <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-white">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-semibold">Light Mode</div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">High-contrast clean light palette</p>
                        </div>
                      </button>

                      {/* System */}
                      <button
                        type="button"
                        onClick={() => handleThemeChange('system')}
                        className={clsx(
                          'p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between',
                          theme === 'system'
                            ? 'bg-brand-600/10 border-brand-500 text-slate-900 dark:text-zinc-100 ring-2 ring-brand-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              <Monitor className="w-4 h-4" />
                            </div>
                            {theme === 'system' && (
                              <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-white">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-semibold">System Default</div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Follows OS color appearance</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <SettingCard
                    title="Compact Mode"
                    description="Reduce padding and toolbars for higher screen density on smaller displays."
                  >
                    <ToggleSwitch
                      checked={settings.compactMode ?? false}
                      onChange={(checked) => updateSetting('compactMode', checked)}
                    />
                  </SettingCard>

                  <SettingCard
                    title="Editor Font Ligatures"
                    description="Enable typographic ligature glyphs (e.g. =>, !=, ===) in SQL and code editors."
                  >
                    <ToggleSwitch
                      checked={(settings.editorFontLigatures ?? settings.editorLigatures) ?? true}
                      onChange={(checked) => {
                        updateSetting('editorFontLigatures', checked);
                        updateSetting('editorLigatures', checked);
                      }}
                    />
                  </SettingCard>
                </>
              )}

              {/* 4. AI / ENGINE CATEGORY */}
              {activeTab === 'ai' && (
                <>
                  <SettingCard
                    title="AI Query & Schema Assistant"
                    description="Enable intelligent SQL generation, execution plan analysis, and error diagnosis."
                  >
                    <ToggleSwitch
                      checked={settings.aiEnabled ?? false}
                      onChange={(checked) => updateSetting('aiEnabled', checked)}
                    />
                  </SettingCard>

                  <SettingCard
                    title="Model Provider"
                    description="Select the backing LLM engine for completions and optimization hints."
                  >
                    <select
                      value={settings.aiProvider || 'gemini-3.8-flash'}
                      onChange={(e) => updateSetting('aiProvider', e.target.value)}
                      disabled={!settings.aiEnabled}
                      className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (Fast & Recommended)</option>
                      <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Deep Analysis)</option>
                      <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                      <option value="gpt-4o">OpenAI GPT-4o</option>
                    </select>
                  </SettingCard>

                  <div className="p-3.5 bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">API Key</div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Stored securely in system keychain/local encrypted vault.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        disabled={!settings.aiEnabled}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.aiApiKey || ''}
                      onChange={(e) => updateSetting('aiApiKey', e.target.value)}
                      disabled={!settings.aiEnabled}
                      placeholder="sk-..."
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 text-xs rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {/* 5. ABOUT CATEGORY */}
              {activeTab === 'about' && (
                <div className="space-y-4">
                  {/* Brand Header Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#15161c] dark:to-[#0e0f13] border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-600/10 dark:bg-brand-500/20 border border-brand-500/30 flex items-center justify-center p-2.5 shadow-lg shadow-brand-500/10">
                      <img src={appIcon} alt="Octa" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">Octa Developer Hub</h4>
                        <span className="px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 font-mono text-[10px] font-bold">
                          v2.0.0
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        High-performance developer workspace for multi-engine Databases, Redis, HTTP APIs, Git, Docker, and ConPTY Terminals.
                      </p>
                    </div>
                  </div>

                  {/* Architecture Specification Cards */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 font-mono">Core Backend</div>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200">Go 1.23 + Wails v2</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">Native Windows PE binary with ConPTY integration</p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 font-mono">Frontend Canvas</div>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200">React 19 + TypeScript + Monaco</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">GPU-accelerated xterm.js & Monaco Editors</p>
                    </div>
                  </div>

                  {/* Native File System Info */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-cyan-500" />
                      <span>Strict Project-Level Isolation (.octa)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                      All connection pools, query scripts, HTTP request collections, and Git configurations are saved directly to your active project workspace file.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-[#14151b]/80 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 text-[10px]">Esc</kbd> to exit
              </span>
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
      </div>
    </div>
  );
};
