import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import { Table as TableIcon, Loader2 } from 'lucide-react';
import { ActiveSession, DatabaseSchema } from '../../types/connection';
import { getDatabaseSchemaDetails } from '../../services/api';
import { TableNode } from './erd/TableNode';
import { getLayoutedElements } from './erd/erdLayout';
import { ErdToolbar } from './erd/ErdToolbar';
import { HomeLanding } from '../layout/HomeLanding';

export interface ErdVisualizerProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const nodeTypes = {
  tableNode: TableNode,
};

const ErdCanvas: React.FC<ErdVisualizerProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [isExporting, setIsExporting] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const { fitView, setCenter, getNode } = useReactFlow();

  const loadSchema = useCallback(
    async (dir: 'LR' | 'TB' = direction) => {
      if (!activeSession) return;
      setLoading(true);
      try {
        const schema: DatabaseSchema = await getDatabaseSchemaDetails(
          activeSession.connection,
          activeSession.activeDatabase
        );

        if (!schema.tables || schema.tables.length === 0) {
          setNodes([]);
          setEdges([]);
          setLoading(false);
          return;
        }

        const rawNodes: Node[] = schema.tables.map((tbl) => ({
          id: tbl.name,
          type: 'tableNode',
          data: { table: tbl },
          position: { x: 0, y: 0 },
        }));

        const rawEdges: Edge[] = (schema.relationships || []).map((rel, idx) => ({
          id: `e-${rel.sourceTable}-${rel.sourceColumn}->${rel.targetTable}-${rel.targetColumn}-${idx}`,
          source: rel.sourceTable,
          target: rel.targetTable,
          sourceHandle: `${rel.sourceTable}-source`,
          targetHandle: `${rel.targetTable}-target`,
          type: 'smoothstep',
          style: { stroke: '#06b6d4', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#06b6d4' },
          label: `${rel.sourceColumn} → ${rel.targetColumn}`,
          labelStyle: { fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#181818', fillOpacity: 0.9 },
          labelBgBorderRadius: 4,
          labelBgPadding: [4, 2] as [number, number],
        }));

        const layouted = getLayoutedElements(rawNodes, rawEdges, dir);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);

        setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 50);
        showToast(`Extracted ERD with ${schema.tables.length} tables`, 'success');
      } catch (err: any) {
        showToast('Failed to load schema: ' + (err?.message || err), 'error');
      } finally {
        setLoading(false);
      }
    },
    [activeSession, direction, fitView, setEdges, setNodes, showToast]
  );

  React.useEffect(() => {
    loadSchema();
  }, [activeSession?.connection?.id, activeSession?.activeDatabase]);

  const handleAutoLayout = () => {
    const nextDir = direction === 'LR' ? 'TB' : 'LR';
    setDirection(nextDir);
    const layouted = getLayoutedElements(nodes, edges, nextDir);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 50);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const target = nodes.find((n) => n.id.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    if (target) {
      const nodeObj = getNode(target.id);
      if (nodeObj) {
        setCenter(nodeObj.position.x + 144, nodeObj.position.y + 100, { zoom: 1.2, duration: 800 });
      }
    } else {
      showToast(`No table matching "${searchQuery}"`, 'info');
    }
  };

  const handleExport = async (format: 'png' | 'svg') => {
    if (!reactFlowWrapper.current) return;
    setIsExporting(true);
    try {
      const dataUrl = format === 'png'
        ? await toPng(reactFlowWrapper.current)
        : await toSvg(reactFlowWrapper.current);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `schema-${activeSession?.activeDatabase}.${format}`;
      a.click();
      showToast(`Exported diagram as ${format.toUpperCase()}`, 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!activeSession) return <HomeLanding onOpenNewModal={onOpenNewModal} />;

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-50 dark:bg-[#0c0d12] relative overflow-hidden font-sans">
      <ErdToolbar
        activeDatabase={activeSession.activeDatabase}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        direction={direction}
        onAutoLayout={handleAutoLayout}
        onFitView={() => fitView({ padding: 0.2, duration: 500 })}
        isExporting={isExporting}
        onExportPng={() => handleExport('png')}
        onExportSvg={() => handleExport('svg')}
        loading={loading}
        onRefresh={() => loadSchema()}
      />

      <div ref={reactFlowWrapper} className="flex-1 w-full h-full relative">
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/70 dark:bg-[#121212]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <span className="text-xs text-slate-600 dark:text-zinc-400 font-mono">Extracting Database Schema...</span>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
          <Controls />
          <MiniMap nodeColor="#3b82f6" />
          {!loading && nodes.length === 0 && (
            <Panel position="top-center" className="mt-20">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2d2d2d] shadow-2xl flex flex-col items-center text-center max-w-sm">
                <TableIcon className="w-8 h-8 text-slate-400 mb-3" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-1">No Tables Found</h3>
                <p className="text-xs text-slate-500 mb-4">No public schema tables found in "{activeSession.activeDatabase}".</p>
                <button
                  type="button"
                  onClick={() => loadSchema()}
                  className="px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-500/10 border border-brand-500/30 rounded-lg hover:bg-brand-500/20"
                >
                  Retry Inspection
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export const ErdVisualizer: React.FC<ErdVisualizerProps> = (props) => (
  <ReactFlowProvider>
    <ErdCanvas {...props} />
  </ReactFlowProvider>
);
