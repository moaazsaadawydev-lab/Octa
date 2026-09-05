import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface NamespaceDeleteModalProps {
  isOpen: boolean;
  namespace: string;
  keysCount: number;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const NamespaceDeleteModal: React.FC<NamespaceDeleteModalProps> = ({
  isOpen,
  namespace,
  keysCount,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
            Delete Namespace?
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
          Are you sure you want to delete all{' '}
          <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
            {keysCount} keys
          </span>{' '}
          inside namespace{' '}
          <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono">
            "{namespace}"
          </span>
          ?
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete All Keys'}
          </button>
        </div>
      </div>
    </div>
  );
};
