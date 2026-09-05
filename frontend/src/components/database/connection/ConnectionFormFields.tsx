import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConnectionConfig } from '../../../types/connection';

interface ConnectionFormFieldsProps {
  formData: ConnectionConfig;
  onChange: (field: keyof ConnectionConfig, value: any) => void;
  onSubmit: (e?: React.FormEvent) => void;
  testStatus: {
    loading: boolean;
    success?: boolean;
    message?: string;
  };
}

export const ConnectionFormFields: React.FC<ConnectionFormFieldsProps> = ({
  formData,
  onChange,
  onSubmit,
  testStatus,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
      {/* Connection Name */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Connection Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
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
            onChange={(e) => onChange('host', e.target.value)}
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
            onChange={(e) => onChange('port', parseInt(e.target.value) || 0)}
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
          onChange={(e) => onChange('database', e.target.value)}
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
            onChange={(e) => onChange('username', e.target.value)}
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
              onChange={(e) => onChange('password', e.target.value)}
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
            onChange={(e) => onChange('ssl', e.target.checked)}
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
  );
};
