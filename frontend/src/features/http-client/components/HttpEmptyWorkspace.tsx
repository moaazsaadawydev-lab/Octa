import React from 'react';
import { Plus } from 'lucide-react';
import interfaceSvg from '../../../assets/interface.svg';

export interface HttpEmptyWorkspaceProps {
  onNewTab: () => void;
}

export const HttpEmptyWorkspace: React.FC<HttpEmptyWorkspaceProps> = ({ onNewTab }) => {
  return (
    <div className="flex-1 w-full h-full bg-slate-50 dark:bg-[#121212] flex flex-col items-center justify-center select-none overflow-hidden p-8">
      <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] max-w-[50vw] max-h-[50vh] flex items-center justify-center pointer-events-none">
        <img
          src={interfaceSvg}
          className="w-full h-full object-contain opacity-45 select-none pointer-events-none drop-shadow-2xl"
          alt="Empty Workspace"
        />
      </div>
      <div className="mt-4 flex flex-col items-center text-center">
        <span className="text-sm font-semibold text-slate-800 dark:text-zinc-300">No Request Selected</span>
        <span className="text-xs text-zinc-500 mt-1 max-w-sm">
          Click a request in the explorer sidebar to open or click + to create a new tab.
        </span>
        <button
          type="button"
          onClick={onNewTab}
          className="mt-6 flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 dark:bg-zinc-800/80 hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-[0.98] border border-slate-300 dark:border-zinc-700/60 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-400" />
          <span>New Request</span>
        </button>
      </div>
    </div>
  );
};
