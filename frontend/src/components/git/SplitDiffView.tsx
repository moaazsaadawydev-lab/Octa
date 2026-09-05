import React from 'react';
import clsx from 'clsx';
import { SplitDiffRow } from './diffParser';

interface SplitDiffViewProps {
  rows: SplitDiffRow[];
}

export const SplitDiffView: React.FC<SplitDiffViewProps> = ({ rows }) => {
  return (
    <div className="divide-y divide-zinc-900/50 min-w-full">
      {rows.map((row, idx) => {
        if (row.hunkHeader) {
          return (
            <div key={idx} className="px-4 py-1.5 text-sky-400/80 bg-sky-950/20 font-semibold select-none">
              {row.hunkHeader}
            </div>
          );
        }

        const isOldDelete = row.oldLine?.type === 'delete';
        const isNewAdd = row.newLine?.type === 'add';

        return (
          <div key={idx} className="flex divide-x divide-zinc-800/80 leading-relaxed min-w-full">
            {/* Left (Old / Deletion Side) */}
            <div
              className={clsx(
                'flex-1 flex min-w-0',
                isOldDelete ? 'bg-rose-950/35 text-rose-300' : 'text-zinc-400'
              )}
            >
              <div className="w-10 px-2 py-0.5 text-right text-zinc-600 select-none bg-zinc-950/60 border-r border-zinc-800/60 text-[11px]">
                {row.oldLine?.number || ''}
              </div>
              <div className="w-5 text-center font-bold select-none opacity-70">
                {isOldDelete ? '-' : ' '}
              </div>
              <div className="flex-1 px-2 py-0.5 whitespace-pre font-mono overflow-hidden truncate">
                {row.oldLine?.text || ' '}
              </div>
            </div>

            {/* Right (New / Addition Side) */}
            <div
              className={clsx(
                'flex-1 flex min-w-0',
                isNewAdd ? 'bg-emerald-950/35 text-emerald-300' : 'text-zinc-300'
              )}
            >
              <div className="w-10 px-2 py-0.5 text-right text-zinc-600 select-none bg-zinc-950/60 border-r border-zinc-800/60 text-[11px]">
                {row.newLine?.number || ''}
              </div>
              <div className="w-5 text-center font-bold select-none opacity-70">
                {isNewAdd ? '+' : ' '}
              </div>
              <div className="flex-1 px-2 py-0.5 whitespace-pre font-mono overflow-hidden truncate">
                {row.newLine?.text || ' '}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
