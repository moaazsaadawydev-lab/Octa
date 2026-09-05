import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ExplainPlanResult, ExplainPlanNode } from '../../types/connection';
import { ExplainMetricsHeader } from './explain/ExplainMetricsHeader';
import { ExplainNodeCard } from './explain/ExplainNodeCard';

export interface ExplainPlanViewerProps {
  planResult: ExplainPlanResult;
  onClose?: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExplainPlanViewer: React.FC<ExplainPlanViewerProps> = ({
  planResult,
  showToast,
}) => {
  const [activeView, setActiveView] = useState<'tree' | 'text' | 'json'>('tree');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  let parsedPlan: ExplainPlanNode | null = null;
  try {
    const rawData = JSON.parse(planResult.planJson);
    if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].Plan) {
      parsedPlan = rawData[0].Plan as ExplainPlanNode;
    }
  } catch (err) {
    console.warn('Failed to parse plan JSON:', err);
  }

  const handleCopyRaw = () => {
    const textToCopy = activeView === 'json' ? planResult.planJson : planResult.rawOutput;
    navigator.clipboard.writeText(textToCopy);
    showToast('Copied execution plan to clipboard', 'success');
  };

  const toggleNodeCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const isAnalyze = Boolean(
    planResult.executionTime > 0 || (parsedPlan && parsedPlan['Actual Total Time'] !== undefined)
  );

  return (
    <div className="flex flex-col h-full bg-[#121212] text-zinc-100 select-none overflow-hidden font-sans">
      <ExplainMetricsHeader
        planResult={planResult}
        isAnalyze={isAnalyze}
        activeView={activeView}
        setActiveView={setActiveView}
        onCopy={handleCopyRaw}
      />

      <div className="flex-1 overflow-y-auto p-4 select-text">
        {activeView === 'tree' && parsedPlan ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <ExplainNodeCard
              node={parsedPlan}
              nodeId="root"
              depth={0}
              totalCost={planResult.totalCost || parsedPlan['Total Cost'] || 1}
              totalTime={planResult.executionTime || parsedPlan['Actual Total Time'] || 1}
              isAnalyze={isAnalyze}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={toggleNodeCollapse}
            />
          </div>
        ) : activeView === 'tree' && !parsedPlan ? (
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Could not render visual node tree. Showing raw text format below:</span>
            </div>
            <pre className="bg-[#181818] border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre select-text">
              {planResult.rawOutput || planResult.planJson}
            </pre>
          </div>
        ) : activeView === 'text' ? (
          <div className="max-w-5xl mx-auto">
            <pre className="bg-[#161616] border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed select-text shadow-inner">
              {planResult.rawOutput}
            </pre>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <pre className="bg-[#161616] border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed select-text shadow-inner">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(planResult.planJson), null, 2);
                } catch {
                  return planResult.planJson;
                }
              })()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
