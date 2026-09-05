import React, { useState } from 'react';
import {
  Upload,
  Loader2,
  X,
} from 'lucide-react';
import { ActiveSession, ImportResult } from '../../types/connection';
import { importSQLScript } from '../../services/api';
import { SqlFileDropzone } from './import/SqlFileDropzone';
import { SqlFilePreview } from './import/SqlFilePreview';

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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#181818] border border-[#2D2D2D] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col select-none">
        {/* Header */}
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

        {/* Body */}
        <div className="p-5 space-y-4">
          {!file ? (
            <SqlFileDropzone onFileSelect={handleFileSelect} />
          ) : (
            <SqlFilePreview
              file={file}
              sqlContent={sqlContent}
              isExecuting={isExecuting}
              importResult={importResult}
              error={error}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Footer */}
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
