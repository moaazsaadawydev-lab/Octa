import React, { useState, useEffect } from 'react';
import { GitBranch, X, Folder, FileText, CheckSquare, Square, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { InitRepoOptions } from '../../types/git';

interface InitRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string;
  onConfirm: (opts: InitRepoOptions) => Promise<void>;
  isInitializing: boolean;
}

export const InitRepoModal: React.FC<InitRepoModalProps> = ({
  isOpen,
  onClose,
  path,
  onConfirm,
  isInitializing,
}) => {
  const [repoName, setRepoName] = useState('');
  const [addGitignore, setAddGitignore] = useState(true);
  const [gitignoreType, setGitignoreType] = useState('Node');
  const [addReadme, setAddReadme] = useState(true);

  useEffect(() => {
    if (path) {
      const folderName = path.split(/[\\/]/).filter(Boolean).pop() || '';
      setRepoName(folderName);
    }
  }, [path]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      path,
      addGitignore,
      gitignoreType,
      addReadme,
      repoName: repoName.trim() || path.split(/[\\/]/).filter(Boolean).pop() || 'repository',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#12131a] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Initialize Git Repository
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                No Git repository found in this folder.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isInitializing}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* 1. Target Folder Path */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
              Directory Location
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#090a0f] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-xs truncate">
              <Folder className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{path}</span>
            </div>
          </div>

          {/* 2. Repository Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
              Repository Name
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="my-project"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090a0f] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* 3. Checkbox Options */}
          <div className="pt-2 space-y-3">
            {/* .gitignore */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#090a0f]/60 border border-slate-200 dark:border-zinc-800/80">
              <label
                onClick={() => setAddGitignore(!addGitignore)}
                className="flex items-center gap-2.5 cursor-pointer text-slate-800 dark:text-zinc-200 font-medium"
              >
                {addGitignore ? (
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 dark:text-zinc-600" />
                )}
                <span>Add .gitignore</span>
              </label>

              {addGitignore && (
                <div className="relative">
                  <select
                    value={gitignoreType}
                    onChange={(e) => setGitignoreType(e.target.value)}
                    className="px-2.5 py-1 pr-6 rounded-lg bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-medium outline-none focus:border-brand-500 appearance-none cursor-pointer"
                  >
                    <option value="Node">Node.js</option>
                    <option value="Go">Go</option>
                    <option value="Python">Python</option>
                    <option value="General">General</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              )}
            </div>

            {/* README.md */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#090a0f]/60 border border-slate-200 dark:border-zinc-800/80">
              <label
                onClick={() => setAddReadme(!addReadme)}
                className="flex items-center gap-2.5 cursor-pointer text-slate-800 dark:text-zinc-200 font-medium"
              >
                {addReadme ? (
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 dark:text-zinc-600" />
                )}
                <span>Initialize README.md</span>
              </label>
              <FileText className="w-4 h-4 text-slate-400 dark:text-zinc-500 mr-1" />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              disabled={isInitializing}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInitializing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{isInitializing ? 'Initializing...' : 'Initialize Repository'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
