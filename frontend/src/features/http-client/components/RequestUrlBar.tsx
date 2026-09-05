import React from 'react';
import { Send, Edit2 } from 'lucide-react';
import { HttpRequestItem, Environment, EnvironmentVariable } from '../types';
import { HttpMethodDropdown } from './HttpMethodDropdown';
import { UrlHighlightInput } from '../../../components/http/UrlHighlightInput';

export interface RequestUrlBarProps {
  activeRequest: HttpRequestItem;
  editingId: string | null;
  editingName: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  isSending: boolean;
  activeEnvironment: Environment | null;
  globalVariables: EnvironmentVariable[];
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  commitNameEdit: () => void;
  updateActiveRequest: (updated: HttpRequestItem) => void;
  handleUrlChange: (newUrl: string) => void;
  handleSendRequest: () => void;
  handleUpdateVariableFromInput: (key: string, newValue: string, source?: 'environment' | 'global') => void;
  handleOpenManageEnvironments: (scopeId?: string) => void;
}

export const RequestUrlBar: React.FC<RequestUrlBarProps> = ({
  activeRequest,
  editingId,
  editingName,
  editInputRef,
  isSending,
  activeEnvironment,
  globalVariables,
  setEditingId,
  setEditingName,
  commitNameEdit,
  updateActiveRequest,
  handleUrlChange,
  handleSendRequest,
  handleUpdateVariableFromInput,
  handleOpenManageEnvironments,
}) => {
  return (
    <div className="p-3 border-b border-slate-200 dark:border-[#242428] bg-white dark:bg-[#161619] flex flex-col gap-2 flex-shrink-0">
      {/* Request Name Header */}
      <div className="flex items-center gap-2">
        {editingId === activeRequest.id ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitNameEdit();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={commitNameEdit}
              className="px-2 py-0.5 text-xs font-semibold bg-[#1f1f23] border border-brand-500 rounded text-white outline-none"
            />
          </form>
        ) : (
          <div
            onClick={() => {
              setEditingId(activeRequest.id);
              setEditingName(activeRequest.name);
            }}
            title="Click to rename request"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white cursor-pointer group"
          >
            <span>{activeRequest.name}</span>
            <Edit2 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* URL Input & Custom Method Bar */}
      <div className="flex items-center gap-2">
        <HttpMethodDropdown
          value={activeRequest.method}
          onChange={(newMethod) => updateActiveRequest({ ...activeRequest, method: newMethod })}
        />

        <UrlHighlightInput
          value={activeRequest.url}
          onChange={handleUrlChange}
          placeholder="https://api.example.com/v1/resource"
          activeEnv={activeEnvironment}
          globalVariables={globalVariables}
          onUpdateVariable={handleUpdateVariableFromInput}
          onOpenManageEnvironments={handleOpenManageEnvironments}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isSending) {
              handleSendRequest();
            }
          }}
        />

        <button
          type="button"
          onClick={handleSendRequest}
          disabled={isSending}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-semibold text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSending ? 'Sending...' : 'Send'}</span>
        </button>
      </div>
    </div>
  );
};
