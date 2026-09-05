import React from 'react';
import { Code2, Layers, Globe } from 'lucide-react';
import { HttpRequestItem, HttpBodyType } from '../types';
import { JsonBodyEditor } from './body/JsonBodyEditor';
import { FormDataBodyEditor } from './body/FormDataBodyEditor';
import { UrlEncodedBodyEditor } from './body/UrlEncodedBodyEditor';

export interface RequestBodyEditorProps {
  activeRequest: HttpRequestItem;
  onSwitchBodyType: (newType: HttpBodyType) => void;
  updateActiveRequest: (updated: HttpRequestItem) => void;
  onFormatJson: () => void;
  onMinifyJson: () => void;
  onClearJson: () => void;
  monacoTheme: string;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  fileToBase64: (file: any) => Promise<string>;
}

export const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({
  activeRequest,
  onSwitchBodyType,
  updateActiveRequest,
  onFormatJson,
  onMinifyJson,
  onClearJson,
  monacoTheme,
  showToast,
  fileToBase64,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 h-full space-y-3">
      {/* Body Type Sub-Navigation Radio Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs self-start flex-shrink-0">
        <button
          type="button"
          onClick={() => onSwitchBodyType('none')}
          className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ${
            activeRequest.bodyType === 'none'
              ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
          }`}
        >
          none
        </button>
        <button
          type="button"
          onClick={() => onSwitchBodyType('json')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ${
            activeRequest.bodyType === 'json'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>json</span>
        </button>
        <button
          type="button"
          onClick={() => onSwitchBodyType('form-data')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ${
            activeRequest.bodyType === 'form-data'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>form-data</span>
        </button>
        <button
          type="button"
          onClick={() => onSwitchBodyType('x-www-form-urlencoded')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ${
            activeRequest.bodyType === 'x-www-form-urlencoded'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>x-www-form-urlencoded</span>
        </button>
      </div>

      {/* None View */}
      {activeRequest.bodyType === 'none' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 select-none">
          <span className="text-xs">This request does not include a body payload.</span>
          <span className="text-[11px] text-zinc-600 mt-1">
            Select <strong className="text-zinc-400">json</strong>, <strong className="text-zinc-400">form-data</strong>, or <strong className="text-zinc-400">x-www-form-urlencoded</strong> above to configure payload data.
          </span>
        </div>
      )}

      {/* JSON View */}
      {activeRequest.bodyType === 'json' && (
        <JsonBodyEditor
          bodyContent={activeRequest.bodyContent || ''}
          onBodyChange={(val) => updateActiveRequest({ ...activeRequest, bodyContent: val, bodyType: 'json' })}
          onFormatJson={onFormatJson}
          onMinifyJson={onMinifyJson}
          onClearJson={onClearJson}
          monacoTheme={monacoTheme}
        />
      )}

      {/* Multipart Form-Data View */}
      {activeRequest.bodyType === 'form-data' && (
        <FormDataBodyEditor
          fields={activeRequest.bodyFormData || []}
          onChange={(fields) => updateActiveRequest({ ...activeRequest, bodyFormData: fields })}
          showToast={showToast}
          fileToBase64={fileToBase64}
        />
      )}

      {/* URL Encoded View */}
      {activeRequest.bodyType === 'x-www-form-urlencoded' && (
        <UrlEncodedBodyEditor
          fields={activeRequest.bodyUrlEncoded || []}
          onChange={(fields) => updateActiveRequest({ ...activeRequest, bodyUrlEncoded: fields })}
        />
      )}
    </div>
  );
};
