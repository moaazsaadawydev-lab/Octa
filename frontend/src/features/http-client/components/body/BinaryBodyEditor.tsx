import React, { useRef, useState } from 'react';
import { FileUp, File, Trash2, RefreshCw, Info, Check, Copy } from 'lucide-react';
import { BinaryFileMeta } from '../../types';
import { formatFileSize } from '../../utils/treeHelpers';
import { selectSingleFileDialog } from '../../../../services/api';

export interface BinaryBodyEditorProps {
  binaryFile?: BinaryFileMeta;
  onChange: (meta: BinaryFileMeta | undefined) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BinaryBodyEditor: React.FC<BinaryBodyEditorProps> = ({
  binaryFile,
  onChange,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const handleSelectNative = async () => {
    try {
      const selected = await selectSingleFileDialog();
      if (selected && selected.filePath) {
        onChange({
          name: selected.name,
          filePath: selected.filePath,
          size: selected.size,
          type: selected.contentType || 'application/octet-stream',
        });
        showToast(`Selected "${selected.name}" (${formatFileSize(selected.size)})`, 'success');
        return;
      }
    } catch (err) {
      console.warn('Native picker failed, using standard input', err);
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string)?.split(',')[1] || '';
      onChange({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        filePath: (file as any).path || '',
        base64: b64,
      });
      showToast(`Loaded "${file.name}" (${formatFileSize(file.size)})`, 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string)?.split(',')[1] || '';
      onChange({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        filePath: (file as any).path || '',
        base64: b64,
      });
      showToast(`Attached "${file.name}"`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyPath = () => {
    if (!binaryFile?.filePath) return;
    navigator.clipboard.writeText(binaryFile.filePath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col space-y-3 min-h-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
        <span>Raw Binary / Octet-Stream Body</span>
        <span className="text-[10px] lowercase font-normal text-zinc-500">
          Streams raw file bytes directly to the server
        </span>
      </div>

      {binaryFile ? (
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50 dark:bg-zinc-900/60 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <File className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm text-slate-800 dark:text-zinc-100 truncate">
                  {binaryFile.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatFileSize(binaryFile.size)}
                  </span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800 text-[10px] font-mono text-slate-600 dark:text-zinc-300">
                    {binaryFile.type || 'application/octet-stream'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleSelectNative}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:border-emerald-500 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Choose a different file"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                title="Remove binary file"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {binaryFile.filePath && (
            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 font-mono text-slate-600 dark:text-zinc-400">
              <span className="truncate pr-2">{binaryFile.filePath}</span>
              <button
                type="button"
                onClick={handleCopyPath}
                className="text-slate-400 hover:text-slate-200 cursor-pointer flex-shrink-0"
                title="Copy file path"
              >
                {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-zinc-400 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2.5">
            <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>MinIO / S3 Direct Upload:</strong> This file will be streamed directly in the request body with{' '}
              <code className="text-emerald-600 dark:text-emerald-400 font-mono">
                Content-Length: {binaryFile.size}
              </code>
              . For S3 Presigned URLs, ensure the HTTP method matches the signature (usually <strong>PUT</strong>).
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={handleSelectNative}
          className={`flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-300 dark:border-zinc-800 hover:border-emerald-500/70 bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-slate-50 dark:hover:bg-zinc-900/60'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-3">
            <FileUp className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
            Select a file or drag and drop here
          </span>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 text-center max-w-sm">
            Streams arbitrary files (images, videos, archives, binaries) directly in the request body for MinIO S3 and raw uploads.
          </span>
          <button
            type="button"
            className="mt-4 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
          >
            Select File
          </button>
        </div>
      )}
    </div>
  );
};
