import React, { useState } from 'react';
import {
  X,
  Database,
  Loader2,
  Plug,
  Save,
  Check
} from 'lucide-react';
import { ConnectionConfig } from '../../types/connection';
import { testConnection, saveConnection } from '../../services/api';
import { EngineSelector } from './connection/EngineSelector';
import { ConnectionFormFields } from './connection/ConnectionFormFields';

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedConfig: ConnectionConfig) => void;
  onConnectDirect: (config: ConnectionConfig) => void;
}

export const NewConnectionModal: React.FC<NewConnectionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onConnectDirect,
}) => {
  const [selectedEngine, setSelectedEngine] = useState<'postgres' | 'mysql' | 'mongodb'>('postgres');

  const [formData, setFormData] = useState<ConnectionConfig>({
    id: 'conn-' + Date.now(),
    name: 'Local Postgres',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: '',
    ssl: false,
  });

  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  const [saveLoading, setSaveLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof ConnectionConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (testStatus.message) {
      setTestStatus({ loading: false });
    }
  };

  const handleTest = async () => {
    setTestStatus({ loading: true, message: undefined });
    const result = await testConnection(formData);
    setTestStatus({
      loading: false,
      success: result.success,
      message: result.message,
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveLoading(true);
    setTestStatus({ loading: false, message: undefined });

    const result = await saveConnection(formData);
    setSaveLoading(false);

    if (result.success) {
      onSaved(formData);
      onClose();
    } else {
      setTestStatus({
        loading: false,
        success: false,
        message: result.message || 'Failed to save connection',
      });
    }
  };

  const handleConnect = async () => {
    setConnectLoading(true);
    setTestStatus({ loading: false, message: undefined });

    const testResult = await testConnection(formData);
    if (!testResult.success) {
      setConnectLoading(false);
      setTestStatus({
        loading: false,
        success: false,
        message: testResult.message,
      });
      return;
    }

    await saveConnection(formData);
    setConnectLoading(false);
    onConnectDirect(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-surface-900 border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100">New Database Connection</h2>
              <p className="text-xs text-gray-400">Configure connection credentials and settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-surface-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Tabs */}
        <EngineSelector
          selectedEngine={selectedEngine}
          onSelectEngine={(engine) => {
            setSelectedEngine(engine);
            handleChange('type', engine);
          }}
          formData={formData}
          onPortChange={(port) => handleChange('port', port)}
        />

        {/* Form Body */}
        <ConnectionFormFields
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSave}
          testStatus={testStatus}
        />

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface-850 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTest}
            disabled={testStatus.loading || saveLoading || connectLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-750 hover:bg-surface-700 text-gray-200 border border-border text-xs font-medium transition-all disabled:opacity-50"
          >
            {testStatus.loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plug className="w-3.5 h-3.5 text-brand-400" />
            )}
            <span>Test Connection</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-750 text-xs font-medium transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saveLoading || testStatus.loading || connectLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-700 hover:bg-surface-650 text-gray-100 border border-border-strong text-xs font-medium transition-all disabled:opacity-50"
            >
              {saveLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-gray-300" />
              )}
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={handleConnect}
              disabled={connectLoading || saveLoading || testStatus.loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {connectLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Connect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
