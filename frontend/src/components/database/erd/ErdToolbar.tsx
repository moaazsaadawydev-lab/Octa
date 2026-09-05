import React from 'react';
import {
  Layers,
  Search,
  GitFork,
  Maximize2,
  Download,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

export interface ErdToolbarProps {
  activeDatabase: string;
  nodeCount: number;
  edgeCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  direction: 'LR' | 'TB';
  onAutoLayout: () => void;
  onFitView: () => void;
  isExporting: boolean;
  onExportPng: () => void;
  onExportSvg: () => void;
  loading: boolean;
  onRefresh: () => void;
}

export const ErdToolbar: React.FC<ErdToolbarProps> = ({
  activeDatabase,
  nodeCount,
  edgeCount,
  searchQuery,
  setSearchQuery,
  onSearch,
  direction,
  onAutoLayout,
  onFitView,
  isExporting,
  onExportPng,
  onExportSvg,
  loading,
  onRefresh,
}) => {
  return (
    <div className="px-4 py-2.5 bg-white dark:bg-[#181818] border-b border-slate-200 dark:border-[#262626] flex items-center justify-between gap-3 z-10 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-gray-100">Schema & ERD Visualizer</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium">
              {activeDatabase}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
            {nodeCount} tables · {edgeCount} relationships
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mr-72">
        <form onSubmit={onSearch} className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table node..."
            className="w-44 sm:w-56 pl-8 pr-3 py-1 text-xs bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-[#2d2d2d] rounded-lg text-slate-900 dark:text-gray-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors font-mono"
          />
        </form>

        <button
          type="button"
          onClick={onAutoLayout}
          title="Rearrange Auto-Layout (Dagre)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <GitFork className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span className="hidden sm:inline">Layout ({direction})</span>
        </button>

        <button
          type="button"
          onClick={onFitView}
          title="Fit Diagram to View"
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#333333] transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="relative group">
          <button
            type="button"
            disabled={isExporting || nodeCount === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2a2a2a] disabled:opacity-50 border border-slate-200 dark:border-[#333333] rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col w-32 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2d2d2d] rounded-lg shadow-2xl py-1 z-30">
            <button
              type="button"
              onClick={onExportPng}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Export as PNG
            </button>
            <button
              type="button"
              onClick={onExportSvg}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Export as SVG
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Reload Schema"
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#333333] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500 dark:text-brand-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
