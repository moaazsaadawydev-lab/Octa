import React from 'react';
import { Save } from 'lucide-react';
import { EditorTab } from '../../../types/editor';

interface EditorHeaderProps {
  tab: EditorTab | null;
  onSave: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  tab,
  onSave,
}) => {
  if (!tab) return null;

  const pathParts = tab.relPath.replace(/\\/g, '/').split('/');

  return (
    <div className="h-8 px-3 bg-slate-50 dark:bg-[#0c0d12] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs select-none flex-shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-mono text-[11px] truncate">
        {pathParts.map((part, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-slate-300 dark:text-zinc-600">/</span>}
            <span className={idx === pathParts.length - 1 ? 'text-slate-800 dark:text-zinc-200 font-medium' : ''}>
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Language Pill */}
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
          {tab.language}
        </span>

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          title="Save File (Ctrl+S)"
          disabled={!tab.isDirty}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
            tab.isDirty
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
              : 'text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800/40 cursor-default'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};
