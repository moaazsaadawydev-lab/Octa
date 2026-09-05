import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { ComputedAutoHeader, StoredCookie } from '../types';
import { HttpTabBar, HttpTabBarProps } from './HttpTabBar';
import { HttpEmptyWorkspace } from './HttpEmptyWorkspace';
import { RequestUrlBar, RequestUrlBarProps } from './RequestUrlBar';
import { RequestConfigTabs } from './RequestConfigTabs';
import { RequestBodyEditor } from './RequestBodyEditor';
import { ResponseViewer } from './ResponseViewer';

export interface HttpMainWorkspacePanelProps {
  tabBarProps: HttpTabBarProps;
  urlBarProps: RequestUrlBarProps;
  activeRequest: import('../types').HttpRequestItem | null;
  requestTab: 'params' | 'headers' | 'body';
  setRequestTab: (tab: 'params' | 'headers' | 'body') => void;
  totalActiveHeadersCount: number;
  matchingCookies: StoredCookie[];
  showAutoHeaders: boolean;
  setShowAutoHeaders: (show: boolean) => void;
  computedAutoHeaders: ComputedAutoHeader[];
  onParamsChange: (params: import('../types').HttpParam[]) => void;
  onToggleAutoHeader: (key: string, enable: boolean) => void;
  updateActiveRequest: (req: import('../types').HttpRequestItem) => void;
  setIsCookieJarOpen: (open: boolean) => void;
  onSwitchBodyType: (type: import('../types').HttpBodyType) => void;
  onFormatJson: () => void;
  onMinifyJson: () => void;
  onClearJson: () => void;
  monacoTheme: string;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  fileToBase64: (file: any) => Promise<string>;
  layoutOrientation: 'horizontal' | 'vertical';
  activeResponseState: import('../types').HttpResponseState | null;
  onNewTab: () => void;
}

export const HttpMainWorkspacePanel: React.FC<HttpMainWorkspacePanelProps> = ({
  tabBarProps,
  urlBarProps,
  activeRequest,
  requestTab,
  setRequestTab,
  totalActiveHeadersCount,
  matchingCookies,
  showAutoHeaders,
  setShowAutoHeaders,
  computedAutoHeaders,
  onParamsChange,
  onToggleAutoHeader,
  updateActiveRequest,
  setIsCookieJarOpen,
  onSwitchBodyType,
  onFormatJson,
  onMinifyJson,
  onClearJson,
  monacoTheme,
  showToast,
  fileToBase64,
  layoutOrientation,
  activeResponseState,
  onNewTab,
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#121214]">
      <HttpTabBar {...tabBarProps} />

      {!activeRequest ? (
        <HttpEmptyWorkspace onNewTab={onNewTab} />
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <RequestUrlBar {...urlBarProps} />

          <div className="flex-1 overflow-hidden">
            <Group key={layoutOrientation} orientation={layoutOrientation} id={'octa_http_workspace_' + layoutOrientation} className="h-full w-full">
              <Panel defaultSize="50%" minSize="20%" className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#131316]">
                <RequestConfigTabs
                  activeRequest={activeRequest}
                  requestTab={requestTab}
                  setRequestTab={setRequestTab}
                  totalActiveHeadersCount={totalActiveHeadersCount}
                  matchingCookies={matchingCookies}
                  showAutoHeaders={showAutoHeaders}
                  setShowAutoHeaders={setShowAutoHeaders}
                  computedAutoHeaders={computedAutoHeaders}
                  handleParamsChange={onParamsChange}
                  handleToggleAutoHeader={onToggleAutoHeader}
                  updateActiveRequest={updateActiveRequest}
                  setIsCookieJarOpen={setIsCookieJarOpen}
                >
                  <RequestBodyEditor
                    activeRequest={activeRequest}
                    onSwitchBodyType={onSwitchBodyType}
                    updateActiveRequest={updateActiveRequest}
                    onFormatJson={onFormatJson}
                    onMinifyJson={onMinifyJson}
                    onClearJson={onClearJson}
                    monacoTheme={monacoTheme}
                    showToast={showToast}
                    fileToBase64={fileToBase64}
                  />
                </RequestConfigTabs>
              </Panel>

              <Separator className={layoutOrientation === 'horizontal' ? 'w-1 bg-slate-200 dark:bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-col-resize relative flex items-center justify-center' : 'h-1 bg-slate-200 dark:bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-row-resize relative flex items-center justify-center'}>
                <div className={layoutOrientation === 'horizontal' ? 'w-0.5 h-8 bg-zinc-600 rounded-full' : 'h-0.5 w-8 bg-zinc-600 rounded-full'} />
              </Separator>

              <Panel defaultSize="50%" minSize="20%" className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#141417]">
                <ResponseViewer
                  activeResponseState={activeResponseState}
                  monacoTheme={monacoTheme}
                  showToast={showToast}
                />
              </Panel>
            </Group>
          </div>
        </div>
      )}
    </div>
  );
};
