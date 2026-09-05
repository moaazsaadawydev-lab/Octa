import React from 'react';
import { Zap, Clock, Activity, Layers, FileText, Code2, Copy } from 'lucide-react';
import { ExplainPlanResult } from '../../../types/connection';

export interface ExplainMetricsHeaderProps {
  planResult: ExplainPlanResult;
  isAnalyze: boolean;
  activeView: 'tree' | 'text' | 'json';
  setActiveView: (view: 'tree' | 'text' | 'json') => void;
  onCopy: () => void;
}

export const ExplainMetricsHeader: React.FC<ExplainMetricsHeaderProps> = ({
  planResult,
  isAnalyze,
  activeView,
  setActiveView,
  onCopy,
}) => {
  return (
    <div className="px-4 py-2.5 bg-[#171717] border-b border-[#292929] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2.5 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-950/70 border border-brand-500/40 text-brand-300 font-mono text-[11px] font-semibold">
          <Zap className="w-3.5 h-3.5 text-brand-400" />
          <span>{isAnalyze ? 'EXPLAIN ANALYZE' : 'EXPLAIN (ESTIMATE)'}</span>
        </div>

        {planResult.totalCost > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[11px] font-mono">
            <span className="text-zinc-500">Total Cost:</span>
            <span className="font-semibold text-amber-400">{planResult.totalCost.toLocaleString()}</span>
          </div>
        )}

        {planResult.planningTime > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[11px] font-mono">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="text-zinc-500">Planning:</span>
            <span className="font-semibold text-cyan-300">{planResult.planningTime.toFixed(3)} ms</span>
          </div>
        )}

        {planResult.executionTime > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400/80">Execution:</span>
            <span className="font-bold text-emerald-300">{planResult.executionTime.toFixed(3)} ms</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-zinc-900 border border-zinc-750 rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveView('tree')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
              activeView === 'tree' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-brand-400" />
            <span>Visual Tree</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('text')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
              activeView === 'text' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Raw Output</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('json')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
              activeView === 'json' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>JSON</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-colors"
          title="Copy to clipboard"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
