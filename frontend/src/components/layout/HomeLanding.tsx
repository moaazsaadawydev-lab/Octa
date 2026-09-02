import React from 'react';
import { Plus } from 'lucide-react';
import interfaceSvg from '../../assets/interface.svg';

interface HomeLandingProps {
  onOpenNewModal?: () => void;
}

export const HomeLanding: React.FC<HomeLandingProps> = ({ onOpenNewModal }) => {
  return (
    <div className="flex-1 w-full h-full bg-slate-50 dark:bg-[#090a0f] flex flex-col items-center justify-center select-none overflow-hidden p-8 transition-colors">
      {/* Central Watermark */}
      <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] max-w-[50vw] max-h-[50vh] flex items-center justify-center pointer-events-none">
        <img
          src={interfaceSvg}
          className="w-full h-full object-contain opacity-40 dark:opacity-45 select-none pointer-events-none drop-shadow-sm dark:drop-shadow-2xl"
        />
      </div>

      {/* Create New Connection Action Button */}
      {onOpenNewModal && (
        <button
          type="button"
          onClick={onOpenNewModal}
          className="mt-8 flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white bg-white hover:bg-slate-100 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 active:scale-[0.98] border border-slate-300 dark:border-zinc-700/80 rounded-lg shadow-sm transition-all duration-150 cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-zinc-200 transition-colors" />
          <span>Create New Connection</span>
        </button>
      )}
    </div>
  );
};
