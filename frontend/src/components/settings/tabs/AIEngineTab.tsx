import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import { AppSettings } from '../../../types/settings';
import { SettingsRowCard, ToggleSwitch, SelectDropdown } from '../../common';

interface AIEngineTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const AIEngineTab: React.FC<AIEngineTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-4">
      {/* 1. Enable AI Assistant */}
      <SettingsRowCard
        icon={<Sparkles className="w-4 h-4 text-purple-500" />}
        title="AI Query Assistant"
        description="Enable intelligent natural-to-SQL generation and error explanations"
      >
        <ToggleSwitch
          checked={Boolean(settings.aiEnabled)}
          onChange={(checked) => onUpdateSettings({ ...settings, aiEnabled: checked })}
        />
      </SettingsRowCard>

      {/* 2. Provider Selection */}
      <SettingsRowCard
        title="AI Provider"
        description="Select the backing LLM engine for processing database prompts"
      >
        <SelectDropdown
          value={settings.aiProvider || 'gemini-3.8-flash'}
          disabled={!settings.aiEnabled}
          onChange={(val) => onUpdateSettings({ ...settings, aiProvider: val })}
          options={[
            { value: 'gemini-3.8-flash', label: 'Google Gemini (Flash)' },
            { value: 'gemini-1.5-pro', label: 'Google Gemini (Pro)' },
            { value: 'gpt-4o', label: 'OpenAI GPT-4o' },
            { value: 'claude-3-5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
            { value: 'ollama-local', label: 'Local Ollama Instance' },
          ]}
        />
      </SettingsRowCard>

      {/* 3. API Key */}
      <SettingsRowCard
        title="API Authentication Key"
        description="Secret API key stored encrypted in local host configuration"
      >
        <div className="relative flex items-center">
          <input
            type={showApiKey ? 'text' : 'password'}
            disabled={!settings.aiEnabled}
            value={settings.aiApiKey || ''}
            onChange={(e) => onUpdateSettings({ ...settings, aiApiKey: e.target.value })}
            placeholder="AIzaSy... / sk-..."
            className="w-56 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs rounded-lg pl-2.5 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!settings.aiEnabled}
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 disabled:opacity-50 cursor-pointer"
          >
            {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </SettingsRowCard>
    </div>
  );
};
