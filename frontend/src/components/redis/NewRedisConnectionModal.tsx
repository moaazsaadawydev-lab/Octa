import React, { useState, useEffect } from 'react';
import { X, Layers, Loader2 } from 'lucide-react';
import { RedisConnectionConfig } from '../../types/redis';
import { connectRedis } from '../../services/api';
import { RedisConnectionFormFields } from './RedisConnectionFormFields';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181b]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 dark:bg-brand-600/20 border border-brand-500/30 text-brand-600 dark:text-brand-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
                {initialConfig ? 'Edit Redis Connection' : 'New Redis Connection'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Connect to a standalone Redis, Sentinel, or cloud instance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <RedisConnectionFormFields
            formData={formData}
            setFormData={setFormData}
            testResult={testResult}
          />

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600 dark:text-brand-400" /> : <Layers className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
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
