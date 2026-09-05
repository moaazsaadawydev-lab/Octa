import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ZSetMember } from '../types';

interface ZSetKeyViewerProps {
  members: ZSetMember[];
  onChange: (members: ZSetMember[]) => void;
}

export const ZSetKeyViewer: React.FC<ZSetKeyViewerProps> = ({ members, onChange }) => {
  const handleAddMember = () => {
    onChange([...members, { member: '', score: 1 }]);
  };

  const handleUpdateScore = (index: number, scoreStr: string) => {
    const score = parseFloat(scoreStr) || 0;
    const nextZ = [...members];
    nextZ[index] = { ...nextZ[index], score };
    onChange(nextZ);
  };

  const handleUpdateMember = (index: number, member: string) => {
    const nextZ = [...members];
    nextZ[index] = { ...nextZ[index], member };
    onChange(nextZ);
  };

  const handleRemoveMember = (index: number) => {
    onChange(members.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
          Sorted Set Members ({members.length})
        </span>
        <button
          type="button"
          onClick={handleAddMember}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Member</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {members.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="number"
              value={item.score}
              onChange={(e) => handleUpdateScore(idx, e.target.value)}
              placeholder="Score"
              className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={item.member}
              onChange={(e) => handleUpdateMember(idx, e.target.value)}
              placeholder="Member"
              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => handleRemoveMember(idx)}
              className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
