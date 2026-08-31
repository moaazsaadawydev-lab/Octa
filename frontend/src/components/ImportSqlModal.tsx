import React, { useState, useRef } from 'react';
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Database,
  ArrowRight,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { ActiveSession, ImportResult } from '../types/connection';
import { importSQLScript } from '../services/api';

interface ImportSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: ActiveSession | null;
  onImportSuccess?: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ImportSqlModal: React.FC<ImportSqlModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onImportSuccess,
  showToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [sqlContent, setSqlContent] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !activeSession) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.sql') && selectedFile.type !== 'text/plain') {
      showToast('Please select a valid .sql file', 'error');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSqlContent(content || '');
    };
    reader.onerror = () => {
      setError('Failed to read selected file');
      showToast('Failed to read selected file', 'error');
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecute = async () => {
    if (!sqlContent.trim()) {
      showToast('SQL script content is empty', 'error');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setImportResult(null);

    try {
      const res = await importSQLScript(
        activeSession.connection,
        activeSession.activeDatabase,
        sqlContent
      );

      setImportResult(res);

      if (res.success) {
        showToast(
          `Imported ${res.statementsExecuted} statements in ${res.durationMs.toFixed(1)}ms`,
          'success'
        );
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setError(res.errorMessage || 'Execution encountered errors');
        showToast('SQL import failed with errors', 'error');
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      const errMsg = err?.message || String(err);
      setError(errMsg);
      showToast(`Import failed: ${errMsg}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSqlContent('');
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Preview first 8 non-empty lines
  const previewLines = sqlContent
    .split('\n')
    .slice(0, 10)
    .join('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#181818] border border-[#2D2D2D] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col select-none">
        {/* 1. Header */}
        <div className="px-5 py-3.5 bg-[#1F1F1F] border-b border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-100">Import SQL Script</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                <span>Target:</span>
                <span className="text-cyan-300 font-medium">
                  {activeSession.connection.name} / {activeSession.activeDatabase}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Body */}
        <div className="p-5 space-y-4">
          {!file ? (
            /* Upload Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
                  : 'border-zinc-700/80 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/70 text-zinc-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql,text/plain"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-3 text-cyan-400 shadow-inner">
                <FileCode className="w-6 h-6" />
              </div>

              <span className="text-sm font-medium text-zinc-200 mb-1">
                Click to browse or drop .sql file here
              </span>
              <span className="text-xs text-zinc-500">
                Supports schema creation, DDL, table drops, and data inserts
              </span>
            </div>
          ) : (
            /* Selected File Details & Preview */
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
                  onClick={handleReset}
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

              {/* Error Banner */}
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
          )}
        </div>

        {/* 3. Footer */}
        <div className="px-5 py-3 bg-[#1C1C1C] border-t border-[#2A2A2A] flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            {isExecuting ? 'Executing statements sequentially...' : 'Ready to execute'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            >
              {importResult?.success ? 'Done' : 'Cancel'}
            </button>

            {file && !importResult?.success && (
              <button
                type="button"
                onClick={handleExecute}
                disabled={isExecuting || !sqlContent.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Execute Script</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
