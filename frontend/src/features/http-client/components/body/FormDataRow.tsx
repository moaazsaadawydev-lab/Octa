import React from 'react';
import { Paperclip, Upload, X, Trash2 } from 'lucide-react';
import { FormDataField, FormFileMeta } from '../../types';
import { formatFileSize } from '../../utils/treeHelpers';
import { selectFilesDialog } from '../../../../services/api';

export interface FormDataRowProps {
  row: FormDataField;
  idx: number;
  onUpdate: (updated: FormDataField) => void;
  onRemove: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  fileToBase64: (file: any) => Promise<string>;
}

export const FormDataRow: React.FC<FormDataRowProps> = ({
  row,
  idx,
  onUpdate,
  onRemove,
  showToast,
  fileToBase64,
}) => {
  const handleSelectFiles = async () => {
    try {
      const nativeFiles = await selectFilesDialog();
      if (nativeFiles && nativeFiles.length > 0) {
        const formatted: FormFileMeta[] = nativeFiles.map((nf: any) => ({
          id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: nf.name || 'file.bin',
          size: nf.size || 0,
          type: nf.contentType || 'application/octet-stream',
          filePath: nf.path || nf.filePath || '',
          base64: nf.base64Data || nf.base64 || '',
        }));
        const newFiles = [...(row.files || []), ...formatted];
        onUpdate({
          ...row,
          files: newFiles,
          fileName: newFiles[0]?.name,
          filePath: newFiles[0]?.filePath,
          base64Data: newFiles[0]?.base64,
        });
        showToast('Attached ' + formatted.length + ' file(s)', 'info');
        return;
      }
    } catch (err) {
      console.warn('Native file picker error, falling back to input', err);
    }
    const fileInput = document.getElementById('file-input-' + (row.id || idx)) as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  return (
    <div className="grid grid-cols-[36px_1.5fr_110px_2.5fr_40px] items-center gap-2 px-3 py-2 text-xs bg-white dark:bg-[#161618] hover:bg-slate-50 dark:hover:bg-[#19191d] transition-colors">
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={row.enabled}
          onChange={(e) => onUpdate({ ...row, enabled: e.target.checked })}
          className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer"
        />
      </div>

      <input
        type="text"
        value={row.key}
        onChange={(e) => onUpdate({ ...row, key: e.target.value })}
        placeholder="Field Name (e.g. file)"
        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-brand-500"
      />

      <select
        value={row.type}
        onChange={(e) => {
          const nextType = e.target.value as 'text' | 'file';
          onUpdate({ ...row, type: nextType, files: nextType === 'file' ? row.files || [] : row.files });
        }}
        className="w-full px-2 py-1 bg-slate-100 dark:bg-[#1f1f23] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-800 dark:text-zinc-200 text-xs outline-none font-medium cursor-pointer"
      >
        <option value="text">Text</option>
        <option value="file">File</option>
      </select>

      {row.type === 'text' ? (
        <input
          type="text"
          value={row.value}
          onChange={(e) => onUpdate({ ...row, value: e.target.value })}
          placeholder="Value"
          className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-brand-500"
        />
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(row.files || []).map((f, fIdx) => (
            <div
              key={f.id || fIdx}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#222227] border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-[11px] font-mono"
            >
              <Paperclip className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="truncate max-w-[120px]" title={f.name}>{f.name}</span>
              <span className="text-[10px] text-zinc-500">({formatFileSize(f.size)})</span>
              <button
                type="button"
                onClick={() => onUpdate({ ...row, files: row.files?.filter((_, i) => i !== fIdx) })}
                className="p-0.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-700/50 transition-colors cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectFiles}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#202024] dark:hover:bg-[#28282e] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-zinc-700/80 text-xs font-medium cursor-pointer transition-colors"
            >
              <Upload className="w-3 h-3 text-brand-400" />
              <span>{row.files && row.files.length > 0 ? 'Add Files' : 'Select Files'}</span>
            </button>
            <input
              id={'file-input-' + (row.id || idx)}
              type="file"
              multiple
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const promises = Array.from(e.target.files).map(async (f) => ({
                    id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    name: f.name,
                    size: f.size,
                    type: f.type || 'application/octet-stream',
                    filePath: (f as any).path || '',
                    base64: await fileToBase64(f),
                    fileObj: f,
                  }));
                  const newFiles = await Promise.all(promises);
                  const combined = [...(row.files || []), ...newFiles];
                  onUpdate({
                    ...row,
                    files: combined,
                    fileName: combined[0]?.name,
                    filePath: combined[0]?.filePath,
                    base64Data: combined[0]?.base64,
                  });
                  showToast('Attached ' + newFiles.length + ' file(s)', 'info');
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onRemove}
          title="Remove Field"
          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
