import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { DockerContainer } from '../../types/docker';

interface DockerDeleteModalProps {
  isOpen: boolean;
  container: DockerContainer;
  onClose: () => void;
  onConfirm: () => void;
}

export const DockerDeleteModal: React.FC<DockerDeleteModalProps> = ({
  isOpen,
  container,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#12131a] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Delete Container?
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              This will forcibly stop and remove container{' '}
              <span className="font-mono text-slate-800 dark:text-zinc-200 font-semibold">
                {container.service || container.name}
              </span>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
          >
            Delete Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
