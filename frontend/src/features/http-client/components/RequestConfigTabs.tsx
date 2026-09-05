import React from 'react';
import { HttpRequestItem, HttpParam, StoredCookie, ComputedAutoHeader } from '../types';
import { ParamsTab } from './tabs/ParamsTab';
import { HeadersTab } from './tabs/HeadersTab';

export interface RequestConfigTabsProps {
  activeRequest: HttpRequestItem;
  requestTab: 'params' | 'headers' | 'body';
  setRequestTab: (tab: 'params' | 'headers' | 'body') => void;
  totalActiveHeadersCount: number;
  matchingCookies: StoredCookie[];
  showAutoHeaders: boolean;
  setShowAutoHeaders: (show: boolean) => void;
  computedAutoHeaders: ComputedAutoHeader[];
  handleParamsChange: (params: HttpParam[]) => void;
  handleToggleAutoHeader: (key: string, enable: boolean) => void;
  updateActiveRequest: (updated: HttpRequestItem) => void;
  setIsCookieJarOpen: (open: boolean) => void;
  children?: React.ReactNode;
}

export const RequestConfigTabs: React.FC<RequestConfigTabsProps> = ({
  activeRequest,
  requestTab,
  setRequestTab,
  totalActiveHeadersCount,
  matchingCookies,
  showAutoHeaders,
  setShowAutoHeaders,
  computedAutoHeaders,
  handleParamsChange,
  handleToggleAutoHeader,
  updateActiveRequest,
  setIsCookieJarOpen,
  children,
}) => {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#131316]">
      {/* Sub-Tab Navigation Header */}
      <div className="px-3 border-b border-slate-200 dark:border-[#242428] bg-slate-50 dark:bg-[#161619] flex items-center gap-1 text-xs flex-shrink-0">
        <button
          type="button"
          onClick={() => setRequestTab('params')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
            requestTab === 'params'
              ? 'border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-300 font-semibold'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          Params ({activeRequest.params.length})
        </button>
        <button
          type="button"
          onClick={() => setRequestTab('headers')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
            requestTab === 'headers'
              ? 'border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-300 font-semibold'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          Headers ({totalActiveHeadersCount})
        </button>
        <button
          type="button"
          onClick={() => setRequestTab('body')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            requestTab === 'body'
              ? 'border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-300 font-semibold'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <span>Body</span>
          {activeRequest.bodyType !== 'none' && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-brand-950/80 border border-brand-500/40 text-brand-300 font-mono">
              {activeRequest.bodyType}
            </span>
          )}
        </button>
      </div>

      {/* Sub-Tab Body */}
      <div
        className={
          'p-3 min-h-0 bg-white dark:bg-[#131316] ' +
          (requestTab === 'body' && activeRequest.bodyType === 'json'
            ? 'flex-1 flex flex-col h-full overflow-hidden'
            : 'flex-1 overflow-y-auto')
        }
      >
        {requestTab === 'params' && (
          <ParamsTab params={activeRequest.params} onChange={handleParamsChange} />
        )}

        {requestTab === 'headers' && (
          <HeadersTab
            headers={activeRequest.headers}
            totalActiveHeadersCount={totalActiveHeadersCount}
            matchingCookies={matchingCookies}
            showAutoHeaders={showAutoHeaders}
            setShowAutoHeaders={setShowAutoHeaders}
            computedAutoHeaders={computedAutoHeaders}
            handleToggleAutoHeader={handleToggleAutoHeader}
            onHeadersChange={(next) => updateActiveRequest({ ...activeRequest, headers: next })}
            setIsCookieJarOpen={setIsCookieJarOpen}
          />
        )}

        {requestTab === 'body' && children}
      </div>
    </div>
  );
};
