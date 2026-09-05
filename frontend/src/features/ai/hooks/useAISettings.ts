import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppSettings } from '../../../types/settings';
import {
  testGeminiConnection,
  saveAISettings,
  getAISettings,
} from '../../../services/aiApi';

export interface SupportedModel {
  id: string;
  label: string;
  description: string;
}

export const SUPPORTED_GEMINI_MODELS: SupportedModel[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Fast, multimodal model optimized for real-time developer workflows',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Highest capability model designed for complex code and deep query reasoning',
  },
];

interface UseAISettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useAISettings({ settings, onUpdateSettings, showToast }: UseAISettingsProps) {
  const [apiKey, setApiKey] = useState<string>(
    () => settings.gemini_api_key ?? settings.aiApiKey ?? ''
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    () => settings.gemini_selected_model ?? 'gemini-2.5-flash'
  );
  const [aiEnabled, setAiEnabled] = useState<boolean>(
    () => Boolean(settings.aiEnabled)
  );

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  // Initial sync with backend config on mount
  useEffect(() => {
    let mounted = true;
    getAISettings().then((cfg) => {
      if (!mounted) return;
      if (cfg.gemini_api_key && !apiKey) {
        setApiKey(cfg.gemini_api_key);
      }
      if (cfg.gemini_selected_model && !settings.gemini_selected_model) {
        setSelectedModel(cfg.gemini_selected_model);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Synchronize when settings prop changes externally
  useEffect(() => {
    if (settings.gemini_api_key !== undefined) {
      setApiKey(settings.gemini_api_key);
    }
    if (settings.gemini_selected_model) {
      setSelectedModel(settings.gemini_selected_model);
    }
    if (settings.aiEnabled !== undefined) {
      setAiEnabled(Boolean(settings.aiEnabled));
    }
  }, [settings.gemini_api_key, settings.gemini_selected_model, settings.aiEnabled]);

  // Check if form has unsaved modifications
  const isDirty = useMemo(() => {
    const savedKey = settings.gemini_api_key ?? settings.aiApiKey ?? '';
    const savedModel = settings.gemini_selected_model ?? 'gemini-2.5-flash';
    const savedEnabled = Boolean(settings.aiEnabled);

    return (
      apiKey !== savedKey ||
      selectedModel !== savedModel ||
      aiEnabled !== savedEnabled
    );
  }, [apiKey, selectedModel, aiEnabled, settings]);

  // Execute verification handshake
  const handleTestConnection = useCallback(async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setTestStatus('error');
      setTestMessage('API Key is required. Please paste your Gemini API key before testing.');
      showToast?.('Please enter an API Key to test', 'error');
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    setTestMessage('');

    try {
      const res = await testGeminiConnection(trimmedKey, selectedModel);
      if (res.success) {
        setTestStatus('success');
        setTestMessage(res.message || 'Connected (Handshake Successful)');
        showToast?.('Gemini handshake verified successfully!', 'success');
      } else {
        setTestStatus('error');
        setTestMessage(res.message || 'Connection failed');
        showToast?.(res.message || 'Handshake failed', 'error');
      }
    } catch (err: any) {
      setTestStatus('error');
      const errStr = err?.message || 'Handshake failed with network or service error';
      setTestMessage(errStr);
      showToast?.(errStr, 'error');
    } finally {
      setIsTesting(false);
    }
  }, [apiKey, selectedModel, showToast]);

  // Save configuration to backend store & AppSettings
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const trimmedKey = apiKey.trim();
      await saveAISettings(trimmedKey, selectedModel);

      const updatedSettings: AppSettings = {
        ...settings,
        aiEnabled,
        aiApiKey: trimmedKey,
        gemini_api_key: trimmedKey,
        gemini_selected_model: selectedModel,
        aiProvider: selectedModel,
      };

      onUpdateSettings(updatedSettings);
      showToast?.('AI Engine settings saved', 'success');
    } catch (err) {
      console.error('[AI useAISettings Save Error]:', err);
      showToast?.('Failed to save AI settings', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, selectedModel, aiEnabled, settings, onUpdateSettings, showToast]);

  return {
    apiKey,
    setApiKey: (k: string) => {
      setApiKey(k);
      setTestStatus('idle');
      setTestMessage('');
    },
    selectedModel,
    setSelectedModel: (m: string) => {
      setSelectedModel(m);
      setTestStatus('idle');
      setTestMessage('');
    },
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
    models: SUPPORTED_GEMINI_MODELS,
  };
}
