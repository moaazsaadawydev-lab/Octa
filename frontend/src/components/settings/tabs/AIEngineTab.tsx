import React from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Cpu,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import { AppSettings } from '../../../types/settings';
import { SettingsRowCard, ToggleSwitch, SelectDropdown } from '../../common';
import { useAISettings } from '../../../features/ai/hooks/useAISettings';

interface AIEngineTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AIEngineTab: React.FC<AIEngineTabProps> = ({
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const {
    apiKey,
    setApiKey,
    selectedModel,
    setSelectedModel,
    aiEnabled,
    setAiEnabled,
    showApiKey,
    setShowApiKey,
    isTesting,
    isSaving,
    testStatus,
    testMessage,
    isDirty,
    handleTestConnection,
    handleSave,
    models,
  } = useAISettings({ settings, onUpdateSettings, showToast });

  const renderStatusBadge = () => {
    if (isTesting) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Verifying...</span>
        </div>
      );
    }
    if (testStatus === 'success') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Connected (Handshake Successful)</span>
        </div>
      );
    }
    if (testStatus === 'error') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Connection Failed</span>
        </div>
      );
    }
    if (!apiKey.trim()) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
          <span>Not Configured</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
        <span>Configured (Not Verified)</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Global AI Assistant Toggle */}
      <SettingsRowCard
        icon={<Sparkles className="w-4 h-4 text-purple-500" />}
        title="AI Query Assistant"
        description="Enable intelligent natural-to-SQL generation and error explanations"
      >
        <ToggleSwitch checked={aiEnabled} onChange={setAiEnabled} />
      </SettingsRowCard>

      {/* 2. Google Gemini API Configuration Card */}
      <div
        className={clsx(
          'p-5 rounded-2xl border transition-all duration-200',
          'bg-slate-50/50 dark:bg-[#0c0d12]/40 border-slate-200 dark:border-zinc-800',
          !aiEnabled && 'opacity-60 pointer-events-none'
        )}
      >
        {/* Card Header with Status Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                Google Gemini Engine
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Configure Google GenAI credentials and model preferences
              </p>
            </div>
          </div>
          {renderStatusBadge()}
        </div>

        {/* Card Body */}
        <div className="pt-4 space-y-4">
          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
              Selected Model
            </label>
            <SelectDropdown
              value={selectedModel}
              onChange={setSelectedModel}
              options={models.map((m) => ({
                value: m.id,
                label: `${m.label}${m.id === 'gemini-2.5-flash' ? ' (Recommended)' : ''}`,
              }))}
            />
            <p className="text-[10px] text-slate-500 dark:text-zinc-500">
              {models.find((m) => m.id === selectedModel)?.description}
            </p>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                <span>Get API Key from Google AI Studio</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="relative flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 text-xs rounded-xl pl-3 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200 cursor-pointer"
                title={showApiKey ? 'Hide API Key' : 'Reveal API Key'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Inline Feedback Banner */}
          {testStatus === 'error' && testMessage && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{testMessage}</span>
            </div>
          )}

          {testStatus === 'success' && testMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{testMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={isTesting || !apiKey.trim()}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSaving || (!isDirty && testStatus !== 'success')}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white disabled:opacity-50 transition-all shadow-sm shadow-brand-500/20 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
