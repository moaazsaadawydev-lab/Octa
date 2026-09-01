import React, { useState } from 'react';
import {
  X,
  Database,
  Server,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plug,
  Save,
  Check
} from 'lucide-react';
import { ConnectionConfig } from '../types/connection';
import { testConnection, saveConnection } from '../services/api';

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
  const [showPassword, setShowPassword] = useState(false);

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
    // Clear previous test status on change
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

    // Validate connection first
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

    // Save and connect
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
        <div className="px-6 pt-4 pb-2 bg-surface-850 border-b border-border/60">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Select Engine
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* PostgreSQL Tab */}
            <button
              type="button"
              onClick={() => {
                setSelectedEngine('postgres');
                handleChange('type', 'postgres');
                if (formData.port === 3306 || formData.port === 27017) {
                  handleChange('port', 5432);
                }
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                selectedEngine === 'postgres'
                  ? 'bg-brand-500/15 border-brand-500/50 text-brand-300 shadow-sm'
                  : 'bg-surface-800 border-border/80 text-gray-400 hover:bg-surface-750'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-brand-400" />
              <span>PostgreSQL</span>
            </button>

            {/* MySQL Tab (Disabled) */}
            <div
              className="relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-surface-900/50 text-gray-500 text-xs font-medium cursor-not-allowed opacity-60"
              title="MySQL support coming in Phase 3"
            >
              <span>MySQL</span>
              <span className="text-[10px] bg-surface-750 text-gray-400 px-1.5 py-0.5 rounded border border-border/50">
                Soon
              </span>
            </div>

            {/* MongoDB Tab (Disabled) */}
            <div
              className="relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-surface-900/50 text-gray-500 text-xs font-medium cursor-not-allowed opacity-60"
              title="MongoDB support coming soon"
            >
              <span>MongoDB</span>
              <span className="text-[10px] bg-surface-750 text-gray-400 px-1.5 py-0.5 rounded border border-border/50">
                Soon
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Connection Name */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Connection Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Local Postgres or Production Replica"
              className="w-full px-3 py-2 bg-surface-800 border border-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
            />
          </div>

          {/* Host and Port Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Host
              </label>
              <input
                type="text"
                required
                value={formData.host}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="localhost or 127.0.0.1"
                className="w-full px-3 py-2 bg-surface-800 border border-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Port
              </label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value) || 0)}
                placeholder="5432"
                className="w-full px-3 py-2 bg-surface-800 border border-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
              />
            </div>
          </div>

          {/* Database */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Initial Database
            </label>
            <input
              type="text"
              required
              value={formData.database}
              onChange={(e) => handleChange('database', e.target.value)}
              placeholder="postgres"
              className="w-full px-3 py-2 bg-surface-800 border border-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
            />
          </div>

          {/* Username and Password Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="postgres"
                className="w-full px-3 py-2 bg-surface-800 border border-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-9 bg-surface-800 border border-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* SSL Checkbox Toggle */}
          <div className="pt-1 flex items-center justify-between p-3 bg-surface-800/60 rounded-lg border border-border/60">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-xs font-medium text-gray-200">SSL Connection</div>
                <div className="text-[11px] text-gray-400">Require SSL mode for secure connection</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.ssl}
                onChange={(e) => handleChange('ssl', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {/* Real-time Status / Feedback Badge */}
          {testStatus.loading && (
            <div className="p-3 rounded-lg bg-surface-800 border border-border flex items-center gap-2.5 text-xs text-brand-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400 flex-shrink-0" />
              <span>Testing connection to PostgreSQL server...</span>
            </div>
          )}

          {!testStatus.loading && testStatus.message && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                testStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-mono break-all text-[12px] leading-relaxed">
                {testStatus.message}
              </div>
            </div>
          )}
        </form>

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
