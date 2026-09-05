import React from 'react';

interface KeyTypeBadgeProps {
  type: string;
}

export const KeyTypeBadge: React.FC<KeyTypeBadgeProps> = ({ type }) => {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'string':
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-500/40 text-blue-400 font-mono">
          STRING
        </span>
      );
    case 'hash':
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-purple-400 font-mono">
          HASH
        </span>
      );
    case 'list':
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-400 font-mono">
          LIST
        </span>
      );
    case 'set':
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-950/70 border border-orange-500/40 text-orange-400 font-mono">
          SET
        </span>
      );
    case 'zset':
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 font-mono">
          ZSET
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
          {(type || 'UNKNOWN').toUpperCase()}
        </span>
      );
  }
};
