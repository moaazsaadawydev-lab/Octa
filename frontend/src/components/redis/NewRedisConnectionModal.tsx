import React, { useState, useEffect } from 'react';
import { X, Layers, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { RedisConnectionConfig } from '../../types/redis';
import { connectRedis } from '../../services/api';

interface NewRedisConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (config: RedisConnectionConfig) => void;
  initialConfig?: RedisConnectionConfig | null;
}

export const NewRedisConnectionModal: React.FC<NewRedisConnectionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialConfig,
}) => {
  const [formData, setFormData] = useState<RedisConnectionConfig>({
    id: 'redis-' + Date.now(),
    name: 'Local Redis',
    host: '127.0.0.1',
    port: 6379,
    username: '',
    password: '',
    db: 0,
    ssl: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setFormData(initialConfig);
    } else {
      setFormData({
        id: 'redis-' + Date.now(),
        name: 'Local Redis',
        host: '127.0.0.1',
        port: 6379,
        username: '',
        password: '',
        db: 0,
        ssl: false,
      });
    }
    setTestResult(null);
  }, [initialConfig, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await connectRedis(formData);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Connected! Redis v${res.serverInfo.redisVersion || 'unknown'} (${res.serverInfo.totalKeys} keys, ${res.serverInfo.usedMemoryHuman || '0B'})`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Connection failed. Ensure Redis server is running.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaved(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans">
      <div className="bg-[#141416] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#18181b]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                {initialConfig ? 'Edit Redis Connection' : 'New Redis Connection'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect to a standalone Redis, Sentinel, or cloud instance.
              </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Connection Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Connection Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Local Redis, Production Cache"
              className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-medium text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
            />
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Host / IP
              </label>
              <input
                type="text"
                required
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="127.0.0.1"
                className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-zinc-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Port
              </label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 6379 })}
                placeholder="6379"
                className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-zinc-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Database Index (0-15) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Database Index (DB)
              </label>
              <select
                value={formData.db}
                onChange={(e) => setFormData({ ...formData, db: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-zinc-100 outline-none transition-all cursor-pointer"
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Username (ACL)
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="default"
                className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Password / Auth Token
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank for no auth"
                className="w-full pl-3 pr-10 py-2 bg-[#1a1a1d] border border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
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
            <label htmlFor="redis-ssl-toggle" className="text-xs text-zinc-300 font-medium cursor-pointer flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-zinc-400" />
              <span>Use TLS / SSL Connection (e.g. Upstash, AWS ElastiCache)</span>
            </label>
          </div>

          {/* Test Connection Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-100 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-normal">{testResult.message}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" /> : <Layers className="w-3.5 h-3.5 text-brand-400" />}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all cursor-pointer"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
