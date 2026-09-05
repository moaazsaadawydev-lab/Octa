import React from 'react';
import { Plus } from 'lucide-react';
import { FormDataField } from '../../types';
import { FormDataRow } from './FormDataRow';

export interface FormDataBodyEditorProps {
  fields: FormDataField[];
  onChange: (fields: FormDataField[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  fileToBase64: (file: any) => Promise<string>;
}

export const FormDataBodyEditor: React.FC<FormDataBodyEditorProps> = ({
  fields,
  onChange,
  showToast,
  fileToBase64,
}) => {
  return (
    <div className="flex-1 flex flex-col space-y-2 min-h-0">
      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
        <span>Multipart Form-Data Fields</span>
        <span className="text-[10px] lowercase font-normal text-zinc-500">
          Supports text inputs and direct file attachments
        </span>
      </div>

      <div className="border border-slate-200 dark:border-[#26262a] rounded-xl overflow-hidden bg-white dark:bg-[#161618]">
        <div className="grid grid-cols-[36px_1.5fr_110px_2.5fr_40px] items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#1a1a1e] border-b border-slate-200 dark:border-[#26262a] text-[11px] font-semibold text-slate-700 dark:text-zinc-400">
          <span className="text-center">#</span>
          <span>Key</span>
          <span>Type</span>
          <span>Value</span>
          <span className="text-right"></span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-[#222226]">
          {fields.map((row, idx) => (
            <FormDataRow
              key={row.id || idx}
              row={row}
              idx={idx}
              onUpdate={(updated) => {
                const next = [...fields];
                next[idx] = updated;
                onChange(next);
              }}
              onRemove={() => onChange(fields.filter((_, i) => i !== idx))}
              showToast={showToast}
              fileToBase64={fileToBase64}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const newField: FormDataField = {
            id: 'fd-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            key: '',
            value: '',
            type: 'text',
            enabled: true,
            files: [],
          };
          onChange([...fields, newField]);
        }}
        className="text-xs text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer self-start mt-2"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Field</span>
      </button>
    </div>
  );
};
