import React from 'react';
import Editor from '@monaco-editor/react';
import { defineOctaTheme } from '../../../types/http';

interface StringKeyViewerProps {
  value: string;
  monacoTheme: string;
  onChange: (val: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const StringKeyViewer: React.FC<StringKeyViewerProps> = ({
  value,
  monacoTheme,
  onChange,
  showToast,
}) => {
  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
      showToast('Formatted JSON', 'info');
    } catch {
      showToast('Value is not valid JSON', 'error');
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed));
      showToast('Minified JSON', 'info');
    } catch {
      showToast('Value is not valid JSON', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#18181c]/50">
        <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
          Value (String / JSON)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrettify}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 cursor-pointer"
          >
            Prettify JSON
          </button>
          <button
            type="button"
            onClick={handleMinify}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 cursor-pointer"
          >
            Minify JSON
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white dark:bg-[#141416]">
        <Editor
          height="100%"
          language="json"
          theme={monacoTheme}
          beforeMount={(monaco) => defineOctaTheme(monaco)}
          value={value}
          onChange={(val) => onChange(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};
