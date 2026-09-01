import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { toPng, toSvg } from 'html-to-image';
import {
  RefreshCw,
  Search,
  Download,
  Maximize2,
  GitFork,
  Layers,
  ArrowRight,
  Database,
  Table as TableIcon,
  ChevronDown,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ActiveSession, DatabaseSchema } from '../../types/connection';
import { getDatabaseSchemaDetails } from '../../services/api';
import { TableNode, TableNodeData } from './erd/TableNode';
import { HomeLanding } from '../layout/HomeLanding';

interface ErdVisualizerProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const nodeTypes = {
  tableNode: TableNode,
};

// Dagre Layout computation
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'LR'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: 140,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    const table = (node.data as unknown as TableNodeData)?.table;
    const colCount = table?.columns?.length || 1;
    const height = 48 + Math.min(colCount, 10) * 28 + 24;
    dagreGraph.setNode(node.id, { width: 288, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 144,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
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

  // Fetch Database Schema and populate Nodes & Edges
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

        // Map tables to nodes
        const rawNodes: Node[] = schema.tables.map((tbl) => ({
          id: tbl.name,
          type: 'tableNode',
          data: { table: tbl },
          position: { x: 0, y: 0 },
        }));

        // Map relationships to edges
        const rawEdges: Edge[] = (schema.relationships || []).map((rel, idx) => ({
          id: `e-${rel.sourceTable}-${rel.sourceColumn}->${rel.targetTable}-${rel.targetColumn}-${idx}`,
          source: rel.sourceTable,
          target: rel.targetTable,
          sourceHandle: `${rel.sourceTable}-source`,
          targetHandle: `${rel.targetTable}-target`,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#06b6d4',
            strokeWidth: 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: '#06b6d4',
          },
          label: `${rel.sourceColumn} → ${rel.targetColumn}`,
          labelStyle: {
            fill: '#a1a1aa',
            fontSize: 10,
            fontFamily: 'monospace',
          },
          labelBgStyle: {
            fill: '#181818',
            fillOpacity: 0.9,
          },
          labelBgBorderRadius: 4,
          labelBgPadding: [4, 2] as [number, number],
        }));

        // Apply Dagre layout
        const layouted = getLayoutedElements(rawNodes, rawEdges, dir);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);

        setTimeout(() => {
          fitView({ padding: 0.2, duration: 600 });
        }, 50);

        showToast(
          `Loaded ${schema.tables.length} tables and ${schema.relationships?.length || 0} relationships`,
          'success'
        );
      } catch (err: any) {
        console.error('Failed to load ERD schema:', err);
        showToast(`Failed to load ERD schema: ${err?.message || err}`, 'error');
      } finally {
        setLoading(false);
      }
    },
    [activeSession, direction, fitView, setEdges, setNodes, showToast]
  );

  useEffect(() => {
    if (activeSession) {
      loadSchema();
    }
  }, [activeSession?.connection.host, activeSession?.activeDatabase]);

  // Handle Search and focus node
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const targetNode = nodes.find((n) =>
      n.id.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    if (targetNode) {
      const nodePosition = getNode(targetNode.id);
      if (nodePosition) {
        setCenter(nodePosition.position.x + 144, nodePosition.position.y + 100, {
          zoom: 1.3,
          duration: 800,
        });
      }
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isHighlighted: n.id === targetNode.id,
          },
        }))
      );
    } else {
      showToast(`Table "${searchQuery}" not found`, 'info');
    }
  };

  // Auto Layout Trigger
  const handleAutoLayout = (newDir?: 'LR' | 'TB') => {
    const targetDir = newDir || (direction === 'LR' ? 'TB' : 'LR');
    setDirection(targetDir);
    const layouted = getLayoutedElements(nodes, edges, targetDir);
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 500 });
    }, 50);
  };

  // Export Diagram to PNG
  const handleExportPng = async () => {
    if (!reactFlowWrapper.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        backgroundColor: '#121212',
        quality: 0.95,
        filter: (node) => {
          // Exclude floating panels and controls from export
          return !node.classList?.contains('react-flow__panel');
        },
      });
      const link = document.createElement('a');
      link.download = `schema_erd_${activeSession?.activeDatabase || 'db'}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToast('ERD diagram exported as PNG', 'success');
    } catch (err: any) {
      console.error('Failed to export PNG:', err);
      showToast('Failed to export ERD diagram', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Diagram to SVG
  const handleExportSvg = async () => {
    if (!reactFlowWrapper.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toSvg(reactFlowWrapper.current, {
        backgroundColor: '#121212',
        filter: (node) => {
          return !node.classList?.contains('react-flow__panel');
        },
      });
      const link = document.createElement('a');
      link.download = `schema_erd_${activeSession?.activeDatabase || 'db'}_${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
      showToast('ERD diagram exported as SVG', 'success');
    } catch (err: any) {
      console.error('Failed to export SVG:', err);
      showToast('Failed to export ERD diagram', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!activeSession) {
    return <HomeLanding onOpenNewModal={onOpenNewModal} />;
  }

  return (
    <div className="flex-1 w-full h-full bg-[#121212] flex flex-col overflow-hidden relative select-none">
      {/* 1. Header Bar */}
      <div className="px-4 py-2.5 bg-[#181818] border-b border-[#262626] flex items-center justify-between gap-3 z-10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-100">Schema & ERD Visualizer</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-medium">
                {activeSession.activeDatabase}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {nodes.length} tables · {edges.length} relationships
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 mr-72">
          {/* Table Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table node..."
              className="w-44 sm:w-56 pl-8 pr-3 py-1 text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg text-gray-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors font-mono"
            />
          </form>

          {/* Auto Layout Button */}
          <button
            type="button"
            onClick={() => handleAutoLayout()}
            title="Rearrange Auto-Layout (Dagre)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-[#222222] hover:bg-[#2a2a2a] border border-[#333333] rounded-lg transition-colors shadow-sm"
          >
            <GitFork className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">Layout ({direction})</span>
          </button>

          {/* Fit View */}
          <button
            type="button"
            onClick={() => fitView({ padding: 0.2, duration: 500 })}
            title="Fit Diagram to View"
            className="p-1.5 rounded-lg bg-[#222222] hover:bg-[#2a2a2a] text-zinc-300 border border-[#333333] transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              disabled={isExporting || nodes.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-[#222222] hover:bg-[#2a2a2a] disabled:opacity-50 border border-[#333333] rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col w-32 bg-[#181818] border border-[#2d2d2d] rounded-lg shadow-2xl py-1 z-30">
              <button
                type="button"
                onClick={handleExportPng}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Export as PNG
              </button>
              <button
                type="button"
                onClick={handleExportSvg}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Export as SVG
              </button>
            </div>
          </div>

          {/* Refresh Schema */}
          <button
            type="button"
            onClick={() => loadSchema()}
            disabled={loading}
            title="Reload Schema"
            className="p-1.5 rounded-lg bg-[#222222] hover:bg-[#2a2a2a] text-zinc-300 border border-[#333333] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. ReactFlow Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 w-full h-full relative">
        {loading && (
          <div className="absolute inset-0 z-20 bg-[#121212]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <span className="text-xs text-zinc-400 font-mono">Extracting Database Schema & Foreign Keys...</span>
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
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
          className="bg-[#121212]"
        >
          {/* Dark Dot Grid Background */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="#262626"
            className="bg-[#121212]"
          />

          {/* Standard Canvas Controls */}
          <Controls
            className="!bg-[#181818] !border !border-[#2d2d2d] !rounded-xl !overflow-hidden !shadow-2xl [&>button]:!bg-[#181818] [&>button]:!border-b [&>button]:!border-[#2d2d2d] [&>button]:!text-zinc-300 hover:[&>button]:!bg-[#222222] [&>button]:!transition-colors"
            showInteractive={false}
          />

          {/* MiniMap */}
          <MiniMap
            nodeColor="#3b82f6"
            maskColor="rgba(18, 18, 18, 0.85)"
            className="!bg-[#181818] !border !border-[#2d2d2d] !rounded-xl !overflow-hidden !shadow-2xl"
          />

          {/* Empty Table State */}
          {!loading && nodes.length === 0 && (
            <Panel position="top-center" className="mt-20">
              <div className="p-6 rounded-2xl bg-[#181818] border border-[#2d2d2d] shadow-2xl flex flex-col items-center text-center max-w-sm">
                <TableIcon className="w-8 h-8 text-zinc-500 mb-3" />
                <h3 className="text-sm font-semibold text-gray-200 mb-1">No Public Tables Found</h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Database &ldquo;{activeSession.activeDatabase}&rdquo; has no public schema tables or schema extraction is empty.
                </p>
                <button
                  type="button"
                  onClick={() => loadSchema()}
                  className="px-3 py-1.5 text-xs font-medium text-brand-300 bg-brand-500/10 border border-brand-500/30 rounded-lg hover:bg-brand-500/20 transition-colors"
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

export const ErdVisualizer: React.FC<ErdVisualizerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ErdCanvas {...props} />
    </ReactFlowProvider>
  );
};
