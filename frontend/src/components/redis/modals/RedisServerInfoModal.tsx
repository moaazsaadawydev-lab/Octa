import React from 'react';
import { Server, X } from 'lucide-react';
import { RedisServerInfo } from '../types';

interface RedisServerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverInfo: RedisServerInfo | null;
}

export const RedisServerInfoModal: React.FC<RedisServerInfoModalProps> = ({
  isOpen,
  onClose,
  serverInfo,
}) => {
  if (!isOpen || !serverInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181b]/60">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
              Redis Server Statistics
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">Redis Version</div>
              <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                v{serverInfo.redisVersion || 'unknown'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">Connected Clients</div>
              <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                {serverInfo.connectedClients}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">Memory Usage</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {serverInfo.usedMemoryHuman || '0 B'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">Total Keys</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {serverInfo.totalKeys}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
