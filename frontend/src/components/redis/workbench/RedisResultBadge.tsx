import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  List,
  Table,
} from 'lucide-react';

interface RedisResultBadgeProps {
  type: string;
  count?: number;
}

export const RedisResultBadge: React.FC<RedisResultBadgeProps> = ({ type, count }) => {
  switch (type) {
    case 'status':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          OK
        </span>
      );
    case 'integer':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-mono text-[11px] font-bold">
          (integer)
        </span>
      );
    case 'slice':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-400 font-mono text-[11px] font-bold">
          <List className="w-3 h-3" />
          Array ({count ?? 0})
        </span>
      );
    case 'map':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-400 font-mono text-[11px] font-bold">
          <Table className="w-3 h-3" />
          Hash / Map
        </span>
      );
    case 'string':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-500/40 text-blue-400 font-mono text-[11px] font-bold">
          String
        </span>
      );
    case 'nil':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[11px]">
          (nil)
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-400 font-mono text-[11px] font-bold">
          <AlertCircle className="w-3 h-3" />
          ERR
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px]">
          {type}
        </span>
      );
  }
};
