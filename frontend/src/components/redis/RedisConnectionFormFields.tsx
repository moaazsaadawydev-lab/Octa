import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { RedisConnectionConfig } from '../../types/redis';

interface RedisConnectionFormFieldsProps {
  formData: RedisConnectionConfig;
  setFormData: React.Dispatch<React.SetStateAction<RedisConnectionConfig>>;
  testResult: {
    success: boolean;
    message: string;
  } | null;
}

export const RedisConnectionFormFields: React.FC<RedisConnectionFormFieldsProps> = ({
  formData,
  setFormData,
  testResult,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      {/* Connection Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
          Connection Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Local Redis, Production Cache"
          className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all"
        />
      </div>

      {/* Host & Port */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
            Host / IP
          </label>
          <input
            type="text"
            required
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            placeholder="127.0.0.1"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
            Port
          </label>
          <input
            type="number"
            required
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 6379 })}
            placeholder="6379"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* Database Index (0-15) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
            Database Index (DB)
          </label>
          <select
            value={formData.db}
            onChange={(e) => setFormData({ ...formData, db: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none transition-all cursor-pointer"
          >
            {Array.from({ length: 16 }, (_, i) => (
              <option key={i} value={i}>
                db{i}
              </option>
            ))}
          </select>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
            Username (ACL)
          </label>
          <input
            type="text"
            value={formData.username || ''}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="default"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
          Password / Auth Token
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password || ''}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Leave blank for no auth"
            className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* SSL/TLS Toggle */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="redis-ssl-toggle"
          checked={formData.ssl || false}
          onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
          className="accent-brand-500 rounded cursor-pointer"
        />
        <label
          htmlFor="redis-ssl-toggle"
          className="text-xs text-slate-700 dark:text-zinc-300 font-medium cursor-pointer flex items-center gap-1"
        >
          <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
          <span>Use TLS / SSL Connection (e.g. Upstash, AWS ElastiCache)</span>
        </label>
      </div>

      {/* Test Connection Banner */}
      {testResult && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-100 ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <span className="leading-normal">{testResult.message}</span>
        </div>
      )}
    </>
  );
};
