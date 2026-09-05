import React from 'react';
import { FileCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { ImportResult } from '../../../types/connection';

interface SqlFilePreviewProps {
  file: File;
  sqlContent: string;
  isExecuting: boolean;
  importResult: ImportResult | null;
  error: string | null;
  onReset: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export const SqlFilePreview: React.FC<SqlFilePreviewProps> = ({
  file,
  sqlContent,
  isExecuting,
  importResult,
  error,
  onReset,
}) => {
  const previewLines = sqlContent.split('\n').slice(0, 10).join('\n');

  return (
    <div className="space-y-3">
      {/* File Info Card */}
      <div className="p-3 bg-zinc-900 border border-zinc-750 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-zinc-100 font-mono truncate">
              {file.name}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {formatFileSize(file.size)} • {sqlContent.length.toLocaleString()} characters
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={isExecuting}
          className="text-xs text-zinc-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
        >
          Change
        </button>
      </div>

      {/* SQL Preview Snippet */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
          Script Preview
        </div>
        <pre className="bg-[#121212] border border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
          {previewLines}
          {sqlContent.split('\n').length > 10 && '\n... (remaining lines omitted)'}
        </pre>
      </div>

      {/* Success Result Banner */}
      {importResult && importResult.success && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-start gap-2.5 text-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-emerald-100">
              Import Executed Successfully
            </div>
            <div className="text-emerald-300/80 font-mono text-[11px]">
              Executed <strong>{importResult.statementsExecuted}</strong> statements in{' '}
              <strong>{importResult.durationMs.toFixed(1)}ms</strong>.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-start gap-2.5 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 overflow-hidden">
            <div className="font-semibold text-rose-100">Execution Failed</div>
            <div className="text-rose-300/90 font-mono text-[11px] whitespace-pre-wrap break-all">
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
