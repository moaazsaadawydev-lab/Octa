import React, { useState } from 'react';
import { Copy, Check, WrapText } from 'lucide-react';

export interface CookieTokenTextareaProps {
  value: string;
  onChange: (val: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CookieTokenTextarea: React.FC<CookieTokenTextareaProps> = ({
  value,
  onChange,
  showToast,
}) => {
  const [wrapLines, setWrapLines] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyValue = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast('Token copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy token', 'error');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-[260px] space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
          Cookie Value / Token <span className="text-rose-500">*</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/80">
            {value.length.toLocaleString()} characters
          </span>

          <button
            type="button"
            onClick={() => setWrapLines(!wrapLines)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors cursor-pointer ${
              wrapLines
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
            }`}
            title="Toggle word wrapping"
          >
            <WrapText className="w-3 h-3" />
            <span>Wrap</span>
          </button>

          <button
            type="button"
            onClick={handleCopyValue}
            disabled={!value}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 disabled:opacity-40 transition-colors cursor-pointer"
            title="Copy token to clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type large JWT token, session ID, or cookie value here..."
        className={`w-full flex-1 min-h-[220px] p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-[#12161f] border border-slate-300 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 resize-y leading-relaxed ${
          wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
        }`}
        spellCheck={false}
      />
    </div>
  );
};
