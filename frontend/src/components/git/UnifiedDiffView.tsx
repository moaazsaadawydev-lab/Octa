import React from 'react';
import clsx from 'clsx';
import { DiffLine } from './diffParser';

interface UnifiedDiffViewProps {
  lines: DiffLine[];
}

export const UnifiedDiffView: React.FC<UnifiedDiffViewProps> = ({ lines }) => {
  return (
    <div className="divide-y divide-zinc-900/50 min-w-full">
      {lines.map((line, idx) => {
        if (line.type === 'header') {
          return (
            <div key={idx} className="px-4 py-1 text-zinc-600 bg-zinc-950/80 select-none text-[11px]">
              {line.text}
            </div>
          );
        }
        if (line.type === 'hunk') {
          return (
            <div key={idx} className="px-4 py-1.5 text-sky-400/80 bg-sky-950/20 font-semibold select-none">
              {line.text}
            </div>
          );
        }

        const isAdd = line.type === 'add';
        const isDelete = line.type === 'delete';

        return (
          <div
            key={idx}
            className={clsx(
              'flex items-stretch leading-relaxed hover:brightness-110 transition-colors',
              isAdd && 'bg-emerald-950/35 text-emerald-300',
              isDelete && 'bg-rose-950/35 text-rose-300',
              !isAdd && !isDelete && 'text-zinc-300'
            )}
          >
            {/* Line Numbers Gutter */}
            <div className="flex select-none flex-shrink-0 text-zinc-600 font-mono text-[11px] text-right bg-zinc-950/60 border-r border-zinc-800/60">
              <span className="w-10 px-2 py-0.5">{line.oldLineNumber || ''}</span>
              <span className="w-10 px-2 py-0.5 border-l border-zinc-900">{line.newLineNumber || ''}</span>
            </div>

            {/* Marker +/- */}
            <div className="w-6 flex items-center justify-center font-bold select-none flex-shrink-0 opacity-70">
              {isAdd ? '+' : isDelete ? '-' : ' '}
            </div>

            {/* Line Content */}
            <div className="flex-1 px-2 py-0.5 whitespace-pre font-mono">
              {line.text || ' '}
            </div>
          </div>
        );
      })}
    </div>
  );
};
