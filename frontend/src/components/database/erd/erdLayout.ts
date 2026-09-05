import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';
import { TableNodeData } from './TableNode';

export const getLayoutedElements = (
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
