import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RedisKeyType } from '../types';

interface NewKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (key: string, type: RedisKeyType, ttl: number, initialValue: any) => Promise<void>;
}

export const NewKeyModal: React.FC<NewKeyModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [key, setKey] = useState('');
  const [type, setType] = useState<RedisKeyType>('string');
  const [stringValue, setStringValue] = useState('');
  const [ttl, setTtl] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    let initialPayload: any = stringValue;
    if (type === 'hash') {
      initialPayload = { field1: 'value1' };
    } else if (type === 'list') {
      initialPayload = ['item1'];
    } else if (type === 'set') {
      initialPayload = ['member1'];
    } else if (type === 'zset') {
      initialPayload = [{ member: 'member1', score: 1 }];
    }

    setIsSubmitting(true);
    try {
      await onSubmit(key.trim(), type, ttl, initialPayload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181b]/60">
          <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            Create New Redis Key
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              Key Name
            </label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. users:session:102"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              Data Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RedisKeyType)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-zinc-100 outline-none cursor-pointer"
            >
              <option value="string">STRING</option>
              <option value="hash">HASH</option>
              <option value="list">LIST</option>
              <option value="set">SET</option>
              <option value="zset">ZSET</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              TTL in Seconds (-1 for Persistent)
            </label>
            <input
              type="number"
              value={ttl}
              onChange={(e) => setTtl(parseInt(e.target.value) || -1)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
