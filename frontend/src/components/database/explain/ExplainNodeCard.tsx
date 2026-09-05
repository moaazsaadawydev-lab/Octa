import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Table,
  AlertTriangle,
} from 'lucide-react';
import { ExplainPlanNode } from '../../../types/connection';

export interface ExplainNodeCardProps {
  node: ExplainPlanNode;
  nodeId: string;
  depth: number;
  totalCost: number;
  totalTime: number;
  isAnalyze: boolean;
  collapsedNodes: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
}

export const ExplainNodeCard: React.FC<ExplainNodeCardProps> = ({
  node,
  nodeId,
  depth,
  totalCost,
  totalTime,
  isAnalyze,
  collapsedNodes,
  onToggleCollapse,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const isCollapsed = Boolean(collapsedNodes[nodeId]);
  const hasChildren = node.Plans && node.Plans.length > 0;

  const nodeType = node['Node Type'] || 'Operation';
  const relName = node['Relation Name'] || node.Alias || '';
  const idxName = node['Index Name'] || '';
  const cost = node['Total Cost'] || 0;
  const actualTime = node['Actual Total Time'];
  const actualRows = node['Actual Rows'];
  const planRows = node['Plan Rows'] || 0;

  const isSeqScan = nodeType.toLowerCase().includes('seq scan');
  const isIndexScan = nodeType.toLowerCase().includes('index');
  const isJoin = nodeType.toLowerCase().includes('join') || nodeType.toLowerCase().includes('nested loop');
  const isAggregate = nodeType.toLowerCase().includes('aggregate') || nodeType.toLowerCase().includes('group') || nodeType.toLowerCase().includes('sort');

  const costPercent = totalCost > 0 ? Math.min(100, Math.round((cost / totalCost) * 100)) : 0;
  const timePercent = isAnalyze && totalTime > 0 && actualTime !== undefined
    ? Math.min(100, Math.round((actualTime / totalTime) * 100))
    : null;

  return (
    <div className={`space-y-3 ${depth > 0 ? 'ml-6 relative border-l-2 border-zinc-800/80 pl-4' : ''}`}>
      <div
        className={`p-3.5 rounded-xl border transition-all ${
          isSeqScan
            ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70 shadow-sm'
            : isIndexScan
            ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/70'
            : isJoin
            ? 'bg-purple-950/20 border-purple-500/40 hover:border-purple-500/70'
            : isAggregate
            ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70'
            : 'bg-zinc-900/80 border-zinc-700 hover:border-zinc-600'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggleCollapse(nodeId)}
                className="mt-0.5 p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-brand-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-brand-400" />
                )}
              </button>
            ) : (
              <div className="mt-1 w-2 h-2 rounded-full bg-zinc-600 ml-1.5 mr-0.5 flex-shrink-0" />
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {nodeType}
                </span>

                {relName && (
                  <span className="text-xs font-mono text-zinc-200 font-semibold flex items-center gap-1">
                    <Table className="w-3 h-3 text-zinc-400" />
                    <span>{relName}</span>
                  </span>
                )}

                {idxName && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    Index: {idxName}
                  </span>
                )}

                {isSeqScan && planRows > 500 && (
                  <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-500/40 px-1.5 py-0.5 rounded font-medium">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    Seq Scan on large table
                  </span>
                )}
              </div>

              {node['Index Cond'] && (
                <div className="text-[11px] font-mono text-emerald-300/90 pl-0.5">
                  <span className="text-zinc-500">Cond:</span> {node['Index Cond']}
                </div>
              )}
              {node.Filter && (
                <div className="text-[11px] font-mono text-amber-300/90 pl-0.5">
                  <span className="text-zinc-500">Filter:</span> {node.Filter}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 text-right">
            {isAnalyze && actualTime !== undefined && (
              <div className="bg-[#141414] border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] font-mono">
                <div className="text-emerald-400 font-bold">{actualTime.toFixed(3)} ms</div>
                <div className="text-[9px] text-zinc-500">{timePercent}% of total</div>
              </div>
            )}
            <div className="bg-[#141414] border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] font-mono">
              <div className="text-amber-300 font-semibold">{cost.toLocaleString()}</div>
              <div className="text-[9px] text-zinc-500">cost ({costPercent}%)</div>
            </div>
            <div className="bg-[#141414] border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] font-mono">
              <div className="text-zinc-200 font-semibold">
                {actualRows !== undefined ? actualRows.toLocaleString() : planRows.toLocaleString()}
              </div>
              <div className="text-[9px] text-zinc-500">
                {actualRows !== undefined ? 'actual rows' : 'est. rows'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors ml-1"
            >
              {showDetails ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono text-zinc-300 bg-zinc-950/50 p-2.5 rounded-lg select-text">
            {node['Startup Cost'] !== undefined && (
              <div><span className="text-zinc-500">Startup Cost:</span> {node['Startup Cost']}</div>
            )}
            {node['Plan Width'] !== undefined && (
              <div><span className="text-zinc-500">Row Width:</span> {node['Plan Width']} B</div>
            )}
            {node['Actual Loops'] !== undefined && (
              <div><span className="text-zinc-500">Loops:</span> {node['Actual Loops']}</div>
            )}
            {node['Rows Removed by Filter'] !== undefined && (
              <div>
                <span className="text-zinc-500">Removed by Filter:</span>{' '}
                <span className="text-rose-300">{node['Rows Removed by Filter']}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && hasChildren && (
        <div className="space-y-3">
          {node.Plans!.map((childNode, cIdx) => (
            <ExplainNodeCard
              key={cIdx}
              node={childNode}
              nodeId={`${nodeId}-${cIdx}`}
              depth={depth + 1}
              totalCost={totalCost}
              totalTime={totalTime}
              isAnalyze={isAnalyze}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
};
