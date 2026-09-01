import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Table, Key, Link2 } from 'lucide-react';
import { TableSchema } from '../../../types/connection';

export interface TableNodeData {
  table: TableSchema;
  isHighlighted?: boolean;
  activeColumnHighlight?: string;
  [key: string]: unknown;
}

function formatColType(typeStr: string): string {
  if (!typeStr) return '';
  const lower = typeStr.toLowerCase();
  if (lower.includes('character varying') || lower === 'varchar') return 'varchar';
  if (lower.includes('timestamp with time zone') || lower === 'timestamptz') return 'timestamptz';
  if (lower.includes('timestamp without time zone') || lower === 'timestamp') return 'timestamp';
  if (lower === 'integer' || lower === 'int4') return 'int';
  if (lower === 'bigint' || lower === 'int8') return 'bigint';
  if (lower === 'smallint' || lower === 'int2') return 'smallint';
  if (lower === 'boolean' || lower === 'bool') return 'bool';
  if (lower === 'double precision' || lower === 'float8') return 'float';
  return lower;
}

export const TableNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as TableNodeData;
  const table = nodeData.table;
  const isHighlighted = Boolean(nodeData.isHighlighted);

  if (!table) return null;

  return (
    <div
      className={`w-72 rounded-xl bg-[#181818] border transition-all duration-200 shadow-xl overflow-hidden font-sans select-none ${
        selected || isHighlighted
          ? 'border-brand-500 ring-2 ring-brand-500/40 shadow-brand-500/10'
          : 'border-[#2d2d2d] hover:border-[#3d3d3d]'
      }`}
    >
      {/* Node Header */}
      <div className="px-3.5 py-2.5 bg-[#1f1f1f] border-b border-[#2d2d2d] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <div className="w-6 h-6 rounded-md bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
            <Table className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs text-gray-100 font-mono truncate" title={table.name}>
            {table.name}
          </span>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#141414] border border-[#2d2d2d] text-gray-400 flex-shrink-0">
          {table.rowCount.toLocaleString()} rows
        </span>
      </div>

      {/* Target Handle on Left for Incoming Foreign Keys */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${table.name}-target`}
        className="!w-2.5 !h-2.5 !bg-brand-400 !border-2 !border-[#181818] hover:!scale-125 transition-transform"
      />

      {/* Columns List */}
      <div className="divide-y divide-[#242424] max-h-72 overflow-y-auto no-scrollbar py-0.5">
        {table.columns && table.columns.length > 0 ? (
          table.columns.map((col) => {
            const isPk = col.isPrimaryKey;
            const isFk = col.isForeignKey;
            const isColHighlighted = nodeData.activeColumnHighlight === col.name;

            return (
              <div
                key={col.name}
                className={`relative px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                  isColHighlighted ? 'bg-brand-500/15 text-brand-200' : 'hover:bg-[#202020]'
                }`}
              >
                {/* Column Target Handle for specific FK matching */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${table.name}-${col.name}-target`}
                  className="!w-1.5 !h-1.5 !bg-cyan-400 !border-none !left-0 opacity-0 group-hover:opacity-100"
                />

                <div className="flex items-center gap-1.5 truncate mr-2">
                  {/* PK Badge */}
                  {isPk && (
                    <span
                      title="Primary Key"
                      className="flex items-center gap-0.5 text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 flex-shrink-0"
                    >
                      <Key className="w-2.5 h-2.5" />
                      <span>PK</span>
                    </span>
                  )}

                  {/* FK Badge */}
                  {isFk && (
                    <span
                      title="Foreign Key"
                      className="flex items-center gap-0.5 text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex-shrink-0"
                    >
                      <Link2 className="w-2.5 h-2.5" />
                      <span>FK</span>
                    </span>
                  )}

                  <span
                    className={`font-mono text-[11px] truncate ${
                      isPk
                        ? 'font-semibold text-gray-100'
                        : isFk
                        ? 'font-medium text-cyan-200'
                        : 'text-gray-300'
                    }`}
                    title={col.name}
                  >
                    {col.name}
                  </span>
                </div>

                {/* Data Type & Nullable Tag */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="text-[10px] font-mono text-zinc-500"
                    title={col.dataType}
                  >
                    {formatColType(col.dataType)}
                  </span>
                  {col.isNullable && (
                    <span
                      title="Nullable"
                      className="text-[9px] font-mono text-zinc-600 font-normal"
                    >
                      ?
                    </span>
                  )}
                </div>

                {/* Column Source Handle for specific FK matching */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${table.name}-${col.name}-source`}
                  className="!w-1.5 !h-1.5 !bg-brand-400 !border-none !right-0 opacity-0 group-hover:opacity-100"
                />
              </div>
            );
          })
        ) : (
          <div className="px-3 py-2 text-center text-[11px] text-gray-500 italic">
            No columns found
          </div>
        )}
      </div>

      {/* Source Handle on Right for Outgoing Foreign Keys */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${table.name}-source`}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-[#181818] hover:!scale-125 transition-transform"
      />
    </div>
  );
});

TableNode.displayName = 'TableNode';
